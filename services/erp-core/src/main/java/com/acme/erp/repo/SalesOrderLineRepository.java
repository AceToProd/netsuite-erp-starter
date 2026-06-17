package com.acme.erp.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.SalesOrderLine;

public interface SalesOrderLineRepository extends JpaRepository<SalesOrderLine, Long> {
    List<SalesOrderLine> findByOrderId(Long orderId);
}
