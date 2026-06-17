package com.acme.erp.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acme.erp.model.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByCode(String code);
}
