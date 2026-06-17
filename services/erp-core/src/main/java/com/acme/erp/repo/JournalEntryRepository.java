package com.acme.erp.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.JournalEntry;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    List<JournalEntry> findByOrderId(Long orderId);
}
