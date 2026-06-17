package com.acme.erp.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.acme.erp.dto.CreatePurchaseOrderRequest;
import com.acme.erp.dto.PurchaseOrderResponse;
import com.acme.erp.model.Account;
import com.acme.erp.model.JournalEntry;
import com.acme.erp.model.PurchaseOrder;
import com.acme.erp.model.PurchaseOrderLine;
import com.acme.erp.repo.AccountRepository;
import com.acme.erp.repo.JournalEntryRepository;
import com.acme.erp.repo.PurchaseOrderLineRepository;
import com.acme.erp.repo.PurchaseOrderRepository;
import com.acme.erp.repo.VendorRepository;

/**
 * Creates purchase orders. Posting a PO writes its lines and a balanced pair of
 * journal entries (DEBIT Inventory/Expense / CREDIT Accounts Payable) — the AP
 * side of the ledger, mirroring how {@link SalesOrderService} posts AR/Revenue.
 */
@Service
public class PurchaseOrderService {

    private static final String INVENTORY_ACCOUNT = "1200"; // Inventory / Expense (fallback to any asset)
    private static final String AP_ACCOUNT = "2000";        // Accounts Payable

    private final VendorRepository vendors;
    private final PurchaseOrderRepository orders;
    private final PurchaseOrderLineRepository orderLines;
    private final AccountRepository accounts;
    private final JournalEntryRepository journal;

    public PurchaseOrderService(VendorRepository vendors,
                                PurchaseOrderRepository orders,
                                PurchaseOrderLineRepository orderLines,
                                AccountRepository accounts,
                                JournalEntryRepository journal) {
        this.vendors = vendors;
        this.orders = orders;
        this.orderLines = orderLines;
        this.accounts = accounts;
        this.journal = journal;
    }

    @Transactional
    public PurchaseOrderResponse create(CreatePurchaseOrderRequest request) {
        if (request == null || request.vendorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "vendorId is required");
        }
        if (!vendors.existsById(request.vendorId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown vendorId: " + request.vendorId());
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one purchase-order line is required");
        }

        PurchaseOrder po = new PurchaseOrder();
        po.setVendorId(request.vendorId());
        po.setStatus("OPEN");
        po.setTotalCents(0);
        po = orders.save(po);

        long total = 0;
        List<PurchaseOrderLine> savedLines = new ArrayList<>();
        for (CreatePurchaseOrderRequest.LineRequest lineReq : request.lines()) {
            int qty = (lineReq.quantity() == null || lineReq.quantity() < 1) ? 1 : lineReq.quantity();
            long unitCost = (lineReq.unitCostCents() == null) ? 0 : lineReq.unitCostCents();

            PurchaseOrderLine line = new PurchaseOrderLine();
            line.setPoId(po.getId());
            line.setItemId(lineReq.itemId());
            line.setDescription(lineReq.description());
            line.setQuantity(qty);
            line.setUnitCostCents(unitCost);
            savedLines.add(orderLines.save(line));

            total += unitCost * qty;
        }

        po.setTotalCents(total);
        po = orders.save(po);

        List<JournalEntry> entries = postJournal(po.getId(), total);

        return PurchaseOrderResponse.of(po, savedLines, entries);
    }

    private List<JournalEntry> postJournal(Long poId, long total) {
        List<JournalEntry> entries = new ArrayList<>();
        Long invId = accountIdOrNull(INVENTORY_ACCOUNT);
        Long apId = accountIdOrNull(AP_ACCOUNT);

        if (invId != null) {
            entries.add(journal.save(buildEntry(poId, invId, "Inventory for PO #" + poId, total, "DEBIT")));
        }
        if (apId != null) {
            entries.add(journal.save(buildEntry(poId, apId, "AP for PO #" + poId, total, "CREDIT")));
        }
        return entries;
    }

    private Long accountIdOrNull(String code) {
        return accounts.findByCode(code).map(Account::getId).orElse(null);
    }

    private JournalEntry buildEntry(Long poId, Long accountId, String desc, long amount, String type) {
        JournalEntry e = new JournalEntry();
        e.setOrderId(poId);
        e.setAccountId(accountId);
        e.setDescription(desc);
        e.setAmountCents(amount);
        e.setEntryType(type);
        return e;
    }

    public PurchaseOrderResponse view(Long poId) {
        PurchaseOrder po = orders.findById(poId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found: " + poId));
        List<PurchaseOrderLine> lines = orderLines.findByPoId(poId);
        List<JournalEntry> entries = journal.findByOrderId(poId);
        return PurchaseOrderResponse.of(po, lines, entries);
    }

    /** Total outstanding AP = sum of OPEN purchase-order totals. */
    public long openPayableCents() {
        return orders.findAll().stream()
                .filter(po -> "OPEN".equalsIgnoreCase(po.getStatus()))
                .mapToLong(PurchaseOrder::getTotalCents)
                .sum();
    }
}
