package com.acme.erp.dto;

import java.time.Instant;
import java.util.List;

import com.acme.erp.model.JournalEntry;
import com.acme.erp.model.SalesOrder;
import com.acme.erp.model.SalesOrderLine;

/** Full view of a sales order: header + lines + the GL postings it generated. */
public record OrderResponse(
        Long id,
        Long customerId,
        String status,
        long totalCents,
        Instant createdAt,
        List<SalesOrderLine> lines,
        List<JournalEntry> journalEntries) {

    public static OrderResponse of(SalesOrder order, List<SalesOrderLine> lines, List<JournalEntry> entries) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getStatus(),
                order.getTotalCents(),
                order.getCreatedAt(),
                lines,
                entries);
    }
}
