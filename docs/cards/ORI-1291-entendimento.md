---
type: entendimento
title: Preço não pode mudar depois que a proposta foi assinada
card: ORI-1291
status: concluído
sprint: Sprint 28
tags: [opportunity, preco, contrato]
updated: 2026-04-19
---

## Qual é a dor hoje

Depois que o cliente assina a proposta, o registro no Salesforce continua
editável. Já aconteceu de um reajuste de tabela ser aplicado em massa e alterar
o valor de propostas que já estavam assinadas.

Quando isso acontece, o documento que o cliente tem em mãos e o que o sistema
mostra passam a divergir. A correção é manual, registro a registro, e depende
de alguém perceber.

## O que se espera

Que a assinatura congele o preço. A partir dali, alterar valor ou desconto
exige um caminho explícito — não pode ser efeito colateral de outra operação.

## Como saberemos que resolveu

- Reajuste de tabela em massa não altera proposta assinada.
- Tentativa de editar preço em proposta assinada é bloqueada com mensagem clara.
- Existe um caminho auditável para o caso legítimo de renegociação.

## Relação com outras regras

Este card é a origem da regra descrita em [[congelamento-preco]], que passou a
valer para todo o projeto depois desta entrega.
