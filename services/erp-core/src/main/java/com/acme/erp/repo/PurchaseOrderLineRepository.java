package com.acme.erp.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.PurchaseOrderLine;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, Long> {
    List<PurchaseOrderLine> findByPoId(Long poId);
}
