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

import com.acme.erp.model.Vendor;
import com.acme.erp.repo.VendorRepository;

@RestController
@RequestMapping("/api/vendors")
public class VendorController {

    private final VendorRepository vendors;

    public VendorController(VendorRepository vendors) {
        this.vendors = vendors;
    }

    @GetMapping
    public List<Vendor> list() {
        return vendors.findAll();
    }

    @GetMapping("/{id}")
    public Vendor get(@PathVariable Long id) {
        return vendors.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Vendor create(@RequestBody Vendor vendor) {
        if (vendor.getName() == null || vendor.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        vendor.setId(null);
        return vendors.save(vendor);
    }
}
