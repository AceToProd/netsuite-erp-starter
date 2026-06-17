package com.acme.erp.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acme.erp.dto.CreatePurchaseOrderRequest;
import com.acme.erp.dto.PurchaseOrderResponse;
import com.acme.erp.model.PurchaseOrder;
import com.acme.erp.repo.PurchaseOrderRepository;
import com.acme.erp.service.PurchaseOrderService;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService service;
    private final PurchaseOrderRepository orders;

    public PurchaseOrderController(PurchaseOrderService service, PurchaseOrderRepository orders) {
        this.service = service;
        this.orders = orders;
    }

    @GetMapping
    public java.util.List<PurchaseOrder> list() {
        return orders.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseOrderResponse get(@PathVariable Long id) {
        return service.view(id);
    }

    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public PurchaseOrderResponse create(@RequestBody CreatePurchaseOrderRequest request) {
        return service.create(request);
    }

    /** Tiny AP summary so the gateway/SPA can show outstanding payables. */
    @GetMapping("/summary/open-payables")
    public Map<String, Object> openPayables() {
        return Map.of("openPayableCents", service.openPayableCents());
    }
}
