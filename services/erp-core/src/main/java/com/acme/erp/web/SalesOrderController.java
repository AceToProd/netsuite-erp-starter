package com.acme.erp.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.acme.erp.dto.CreateOrderRequest;
import com.acme.erp.dto.OrderResponse;
import com.acme.erp.model.SalesOrder;
import com.acme.erp.repo.SalesOrderRepository;
import com.acme.erp.service.SalesOrderService;

@RestController
@RequestMapping("/api/sales-orders")
public class SalesOrderController {

    private final SalesOrderService salesOrders;
    private final SalesOrderRepository orderRepo;

    public SalesOrderController(SalesOrderService salesOrders, SalesOrderRepository orderRepo) {
        this.salesOrders = salesOrders;
        this.orderRepo = orderRepo;
    }

    @GetMapping
    public List<SalesOrder> list() {
        return orderRepo.findAll();
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return salesOrders.view(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody CreateOrderRequest request) {
        return salesOrders.create(request);
    }
}
