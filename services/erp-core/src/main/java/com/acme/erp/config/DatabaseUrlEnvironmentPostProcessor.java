package com.acme.erp.config;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Converts a cloud-style DATABASE_URL into Spring datasource properties.
 *
 * <p>Supported forms:
 * <ul>
 *   <li>{@code postgres://user:pass@host:port/db} (Heroku / Cloud SQL style) — parsed
 *       into a {@code jdbc:postgresql://...} url plus username/password.</li>
 *   <li>{@code postgresql://...} — same as above.</li>
 *   <li>{@code jdbc:postgresql://...} — used verbatim.</li>
 * </ul>
 *
 * <p>When a Postgres URL is detected, the {@code postgres} profile is activated
 * (switching the driver/dialect and enabling Flyway). When DATABASE_URL is
 * absent or not recognised, nothing happens and the app uses the embedded H2
 * datasource from {@code application.properties} (zero-infra mode).
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return; // keep embedded H2 default
        }

        String raw = databaseUrl.trim();
        Map<String, Object> props = new HashMap<>();

        if (raw.startsWith("jdbc:")) {
            props.put("spring.datasource.url", raw);
        } else if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
            try {
                URI uri = new URI(raw);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isEmpty()) {
                    String[] creds = userInfo.split(":", 2);
                    props.put("spring.datasource.username", decode(creds[0]));
                    if (creds.length > 1) {
                        props.put("spring.datasource.password", decode(creds[1]));
                    }
                }
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = (uri.getPath() == null) ? "" : uri.getPath();
                String query = (uri.getQuery() == null) ? "" : uri.getQuery();

                // Cloud SQL / libpq unix-socket form:
                //   postgresql://user:pass@localhost/db?host=/cloudsql/INSTANCE
                // pgjdbc can't parse the `host=` socket-dir param, so route the
                // connection through junixsocket to the proxy's socket file.
                String socketDir = queryParam(query, "host");
                String jdbcUrl;
                if (socketDir != null && socketDir.startsWith("/")) {
                    String socketPath = socketDir.endsWith("/")
                            ? socketDir + ".s.PGSQL.5432"
                            : socketDir + "/.s.PGSQL.5432";
                    jdbcUrl = "jdbc:postgresql://localhost" + path
                            + "?socketFactory=org.newsclub.net.unix.AFUNIXSocketFactory$FactoryArg"
                            + "&socketFactoryArg=" + socketPath
                            + "&sslmode=disable";
                } else {
                    String host = (uri.getHost() == null) ? "localhost" : uri.getHost();
                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path
                            + (query.isEmpty() ? "" : "?" + query);
                }
                props.put("spring.datasource.url", jdbcUrl);
            } catch (URISyntaxException ex) {
                // Unparseable — leave the H2 default in place.
                return;
            }
        } else {
            return; // unknown scheme; keep H2
        }

        // Switch driver/dialect/Flyway to Postgres *directly* here (highest
        // precedence) rather than relying on application-postgres.properties:
        // activating a profile from an EnvironmentPostProcessor runs too late to
        // load the profile-specific config, so the H2 driver-class-name from
        // application.properties would otherwise win (it did — boot failed with
        // "Driver org.h2.Driver claims to not accept jdbcUrl jdbc:postgresql://").
        props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
        props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
        props.put("spring.jpa.hibernate.ddl-auto", "none");
        props.put("spring.flyway.enabled", "true");
        props.put("spring.flyway.baseline-on-migrate", "true");

        environment.addActiveProfile("postgres");
        environment.getPropertySources().addFirst(new MapPropertySource("aceDatabaseUrl", props));
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    /** Returns the (decoded) value of a query parameter, or null if absent. */
    private static String queryParam(String query, String key) {
        if (query == null || query.isEmpty()) {
            return null;
        }
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            String k = eq >= 0 ? pair.substring(0, eq) : pair;
            if (k.equals(key) && eq >= 0) {
                return decode(pair.substring(eq + 1));
            }
        }
        return null;
    }
}
