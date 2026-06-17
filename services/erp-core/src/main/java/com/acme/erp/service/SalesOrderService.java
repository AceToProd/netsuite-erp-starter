package com.acme.erp.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.acme.erp.dto.CreateOrderRequest;
import com.acme.erp.dto.OrderResponse;
import com.acme.erp.model.Account;
import com.acme.erp.model.Item;
import com.acme.erp.model.JournalEntry;
import com.acme.erp.model.SalesOrder;
import com.acme.erp.model.SalesOrderLine;
import com.acme.erp.repo.AccountRepository;
import com.acme.erp.repo.CustomerRepository;
import com.acme.erp.repo.ItemRepository;
import com.acme.erp.repo.JournalEntryRepository;
import com.acme.erp.repo.SalesOrderLineRepository;
import com.acme.erp.repo.SalesOrderRepository;

/**
 * Creates sales orders. Posting an order writes its lines and a balanced pair of
 * journal entries (DEBIT Accounts Receivable / CREDIT Sales Revenue) for ERP feel.
 */
@Service
public class SalesOrderService {

    private static final String AR_ACCOUNT = "1100";       // Accounts Receivable
    private static final String REVENUE_ACCOUNT = "4000";  // Sales Revenue

    private final CustomerRepository customers;
    private final ItemRepository items;
    private final SalesOrderRepository orders;
    private final SalesOrderLineRepository orderLines;
    private final AccountRepository accounts;
    private final JournalEntryRepository journal;

    public SalesOrderService(CustomerRepository customers,
                             ItemRepository items,
                             SalesOrderRepository orders,
                             SalesOrderLineRepository orderLines,
                             AccountRepository accounts,
                             JournalEntryRepository journal) {
        this.customers = customers;
        this.items = items;
        this.orders = orders;
        this.orderLines = orderLines;
        this.accounts = accounts;
        this.journal = journal;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        if (request == null || request.customerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerId is required");
        }
        if (!customers.existsById(request.customerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customerId: " + request.customerId());
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one order line is required");
        }

        SalesOrder order = new SalesOrder();
        order.setCustomerId(request.customerId());
        order.setStatus("POSTED");
        order.setTotalCents(0);
        order = orders.save(order);

        long total = 0;
        List<SalesOrderLine> savedLines = new ArrayList<>();
        for (CreateOrderRequest.LineRequest lineReq : request.lines()) {
            if (lineReq.itemId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "itemId is required on every line");
            }
            Item item = items.findById(lineReq.itemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Unknown itemId: " + lineReq.itemId()));

            int qty = (lineReq.quantity() == null || lineReq.quantity() < 1) ? 1 : lineReq.quantity();
            long unitPrice = (lineReq.unitPriceCents() == null) ? item.getPriceCents() : lineReq.unitPriceCents();

            SalesOrderLine line = new SalesOrderLine();
            line.setOrderId(order.getId());
            line.setItemId(item.getId());
            line.setQuantity(qty);
            line.setUnitPriceCents(unitPrice);
            savedLines.add(orderLines.save(line));

            total += unitPrice * qty;
        }

        order.setTotalCents(total);
        order = orders.save(order);

        List<JournalEntry> entries = postJournal(order.getId(), total);

        return OrderResponse.of(order, savedLines, entries);
    }

    private List<JournalEntry> postJournal(Long orderId, long total) {
        List<JournalEntry> entries = new ArrayList<>();
        Long arId = accountIdOrNull(AR_ACCOUNT);
        Long revId = accountIdOrNull(REVENUE_ACCOUNT);

        if (arId != null) {
            entries.add(journal.save(buildEntry(orderId, arId, "AR for order #" + orderId, total, "DEBIT")));
        }
        if (revId != null) {
            entries.add(journal.save(buildEntry(orderId, revId, "Revenue for order #" + orderId, total, "CREDIT")));
        }
        return entries;
    }

    private Long accountIdOrNull(String code) {
        return accounts.findByCode(code).map(Account::getId).orElse(null);
    }

    private JournalEntry buildEntry(Long orderId, Long accountId, String desc, long amount, String type) {
        JournalEntry e = new JournalEntry();
        e.setOrderId(orderId);
        e.setAccountId(accountId);
        e.setDescription(desc);
        e.setAmountCents(amount);
        e.setEntryType(type);
        return e;
    }

    public OrderResponse view(Long orderId) {
        SalesOrder order = orders.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));
        List<SalesOrderLine> lines = orderLines.findByOrderId(orderId);
        List<JournalEntry> entries = journal.findByOrderId(orderId);
        return OrderResponse.of(order, lines, entries);
    }
}
