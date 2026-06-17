package com.acme.erp.web;

import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", "erp-core");

        Map<String, Object> db = new LinkedHashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            boolean valid = conn.isValid(2);
            db.put("status", valid ? "up" : "down");
            db.put("product", conn.getMetaData().getDatabaseProductName());
            db.put("url", conn.getMetaData().getURL());
        } catch (Exception ex) {
            body.put("status", "degraded");
            db.put("status", "down");
            db.put("error", ex.getMessage());
        }
        body.put("db", db);
        return body;
    }
}
