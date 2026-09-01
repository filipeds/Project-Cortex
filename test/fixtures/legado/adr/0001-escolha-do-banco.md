---
title: Escolha do banco de dados
status: decidida
updated: 2026-03-11
---

# ADR 0001 — Escolha do banco de dados

## Decisão

Postgres gerenciado, com réplica de leitura em outra zona.

## Por que

O time já opera Postgres em dois produtos, e a réplica cobre o relatório
pesado sem competir com a escrita.

Consequência direta em [0002](0002-autenticacao.md).
