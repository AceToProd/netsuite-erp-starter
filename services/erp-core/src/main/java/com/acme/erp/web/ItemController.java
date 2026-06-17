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
import org.springframework.web.server.ResponseStatusException;

import com.acme.erp.model.Item;
import com.acme.erp.repo.ItemRepository;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemRepository items;

    public ItemController(ItemRepository items) {
        this.items = items;
    }

    @GetMapping
    public List<Item> list() {
        return items.findAll();
    }

    @GetMapping("/{id}")
    public Item get(@PathVariable Long id) {
        return items.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Item create(@RequestBody Item item) {
        if (item.getSku() == null || item.getSku().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sku is required");
        }
        if (item.getName() == null || item.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        items.findBySku(item.getSku()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "sku already exists: " + item.getSku());
        });
        item.setId(null);
        return items.save(item);
    }
}
