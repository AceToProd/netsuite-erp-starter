package com.acme.erp.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.SalesOrder;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {
}
