package com.acme.erp.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.Item;

public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findBySku(String sku);
}
