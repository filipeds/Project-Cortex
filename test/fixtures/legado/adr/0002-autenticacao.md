---
title: Autenticação por token de curta duração
status: decidida
updated: 2026-03-28
parent: 0001-escolha-do-banco
---

# ADR 0002 — Autenticação

## Decisão

Token de 15 minutos, renovado por refresh token guardado no banco escolhido
em [0001](0001-escolha-do-banco.md).

## O que foi descartado

Sessão em memória: não sobrevive ao redeploy, e o time faz vários por dia.
