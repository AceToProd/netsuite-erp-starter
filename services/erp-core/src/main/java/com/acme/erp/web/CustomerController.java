package com.acme.erp.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.acme.erp.model.Customer;
import com.acme.erp.repo.CustomerRepository;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository customers;

    public CustomerController(CustomerRepository customers) {
        this.customers = customers;
    }

    @GetMapping
    public List<Customer> list() {
        return customers.findAll();
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable Long id) {
        return customers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@RequestBody Customer customer) {
        if (customer.getName() == null || customer.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        customer.setId(null);
        return customers.save(customer);
    }
}
