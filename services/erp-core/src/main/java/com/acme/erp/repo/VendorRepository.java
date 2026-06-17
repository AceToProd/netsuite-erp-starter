package com.acme.erp.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.Vendor;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
}
