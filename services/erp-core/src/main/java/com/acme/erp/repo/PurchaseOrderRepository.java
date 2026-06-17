package com.acme.erp.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.PurchaseOrder;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
}
