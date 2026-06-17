package com.acme.erp.dto;

import java.util.List;

/** Request body for POST /api/purchase-orders. */
public record CreatePurchaseOrderRequest(Long vendorId, List<LineRequest> lines) {

    /** A single PO line. description is optional; itemId is optional. */
    public record LineRequest(Long itemId, String description, Integer quantity, Long unitCostCents) {
    }
}
