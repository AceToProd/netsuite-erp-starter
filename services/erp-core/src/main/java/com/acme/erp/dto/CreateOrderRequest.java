package com.acme.erp.dto;

import java.util.List;

/** Request body for POST /api/sales-orders. */
public record CreateOrderRequest(Long customerId, List<LineRequest> lines) {

    /** A single order line; unitPriceCents is optional (defaults to the item price). */
    public record LineRequest(Long itemId, Integer quantity, Long unitPriceCents) {
    }
}
