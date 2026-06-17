package com.acme.erp.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
