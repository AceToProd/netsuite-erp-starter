package com.acme.erp.seed;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.acme.erp.dto.CreateOrderRequest;
import com.acme.erp.model.Account;
import com.acme.erp.model.Customer;
import com.acme.erp.model.Item;
import com.acme.erp.repo.AccountRepository;
import com.acme.erp.repo.CustomerRepository;
import com.acme.erp.repo.ItemRepository;
import com.acme.erp.repo.SalesOrderRepository;
import com.acme.erp.service.SalesOrderService;

/**
 * Seeds demo data when the database is empty. On the H2 zero-infra profile this
 * is the only seed path (Flyway is disabled). On Postgres, Flyway already seeds
 * the master rows, so this only adds a couple of demo orders if none exist.
 */
@Component
@ConditionalOnProperty(name = "erp.seed-demo", havingValue = "1", matchIfMissing = false)
public class DataSeeder implements CommandLineRunner {

    private final CustomerRepository customers;
    private final ItemRepository items;
    private final AccountRepository accounts;
    private final SalesOrderRepository orders;
    private final SalesOrderService salesOrders;

    public DataSeeder(CustomerRepository customers,
                      ItemRepository items,
                      AccountRepository accounts,
                      SalesOrderRepository orders,
                      SalesOrderService salesOrders) {
        this.customers = customers;
        this.items = items;
        this.accounts = accounts;
        this.orders = orders;
        this.salesOrders = salesOrders;
    }

    @Override
    public void run(String... args) {
        seedMasterData();
        seedDemoOrders();
    }

    private void seedMasterData() {
        if (customers.count() == 0) {
            customers.save(customer("Acme Corporation", "ap@acme.example"));
            customers.save(customer("Globex LLC", "billing@globex.example"));
            customers.save(customer("Initech Inc", "accounts@initech.example"));
        }
        if (items.count() == 0) {
            items.save(item("SKU-1001", "Standard Widget", 1999));
            items.save(item("SKU-1002", "Premium Widget", 4999));
            items.save(item("SKU-2001", "Enterprise License", 99900));
            items.save(item("SKU-3001", "Support Plan (yr)", 29900));
            items.save(item("SKU-4001", "Onboarding Service", 15000));
        }
        if (accounts.count() == 0) {
            accounts.save(account("1000", "Cash", "ASSET"));
            accounts.save(account("1100", "Accounts Receivable", "ASSET"));
            accounts.save(account("4000", "Sales Revenue", "REVENUE"));
        }
    }

    private void seedDemoOrders() {
        // Only create demo orders once (idempotent across restarts).
        if (orders.count() > 0) {
            return;
        }
        List<Customer> allCustomers = customers.findAll();
        List<Item> allItems = items.findAll();
        if (allCustomers.isEmpty() || allItems.isEmpty()) {
            return;
        }
        try {
            // Order 1: 2x Standard Widget + 1x Support Plan for the first customer.
            salesOrders.create(new CreateOrderRequest(
                    allCustomers.get(0).getId(),
                    List.of(
                            new CreateOrderRequest.LineRequest(allItems.get(0).getId(), 2, null),
                            new CreateOrderRequest.LineRequest(allItems.get(3).getId(), 1, null))));
            // Order 2: 1x Enterprise License for the second customer.
            if (allCustomers.size() > 1) {
                salesOrders.create(new CreateOrderRequest(
                        allCustomers.get(1).getId(),
                        List.of(new CreateOrderRequest.LineRequest(allItems.get(2).getId(), 1, null))));
            }
        } catch (RuntimeException ex) {
            // Seeding is best-effort; never block startup.
        }
    }

    private static Customer customer(String name, String email) {
        Customer c = new Customer();
        c.setName(name);
        c.setEmail(email);
        return c;
    }

    private static Item item(String sku, String name, long priceCents) {
        Item i = new Item();
        i.setSku(sku);
        i.setName(name);
        i.setPriceCents(priceCents);
        return i;
    }

    private static Account account(String code, String name, String type) {
        Account a = new Account();
        a.setCode(code);
        a.setName(name);
        a.setType(type);
        return a;
    }
}
