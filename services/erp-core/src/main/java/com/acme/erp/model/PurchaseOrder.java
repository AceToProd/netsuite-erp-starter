package com.acme.erp.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A purchase order raised against a vendor (Accounts Payable). */
@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(nullable = false)
    private String status = "OPEN";

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getTotalCents() { return totalCents; }
    public void setTotalCents(long totalCents) { this.totalCents = totalCents; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
