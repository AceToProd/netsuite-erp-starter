package com.acme.erp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A single line on a purchase order. */
@Entity
@Table(name = "purchase_order_lines")
public class PurchaseOrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "po_id", nullable = false)
    private Long poId;

    @Column(name = "item_id")
    private Long itemId;

    private String description;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "unit_cost_cents", nullable = false)
    private long unitCostCents;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPoId() { return poId; }
    public void setPoId(Long poId) { this.poId = poId; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public long getUnitCostCents() { return unitCostCents; }
    public void setUnitCostCents(long unitCostCents) { this.unitCostCents = unitCostCents; }
}
