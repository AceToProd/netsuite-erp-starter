package com.acme.erp.dto;

import java.time.Instant;
import java.util.List;

import com.acme.erp.model.JournalEntry;
import com.acme.erp.model.PurchaseOrder;
import com.acme.erp.model.PurchaseOrderLine;

/** Full view of a purchase order: header + lines + the GL postings it generated. */
public record PurchaseOrderResponse(
        Long id,
        Long vendorId,
        String status,
        long totalCents,
        Instant createdAt,
        List<PurchaseOrderLine> lines,
        List<JournalEntry> journalEntries) {

    public static PurchaseOrderResponse of(PurchaseOrder po, List<PurchaseOrderLine> lines, List<JournalEntry> entries) {
        return new PurchaseOrderResponse(
                po.getId(),
                po.getVendorId(),
                po.getStatus(),
                po.getTotalCents(),
                po.getCreatedAt(),
                lines,
                entries);
    }
}
