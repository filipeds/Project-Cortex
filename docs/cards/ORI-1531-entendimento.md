---
type: entendimento
title: Estender a alçada de desconto para orçamentos
card: ORI-1531
status: backlog
sprint: nao priorizado
tags: [quote, aprovacao, comercial]
updated: 2026-08-20
---

## Qual é a dor hoje

A alçada de aprovação de desconto entregue em [[ORI-1487-aprovacao-desconto]]
vale apenas para a proposta. O orçamento, que é o documento que o vendedor
manda antes de fechar, não passa por aprovação nenhuma.

Na prática o vendedor consegue enviar um orçamento com 40% de desconto, o
cliente ancora a negociação naquele número, e a aprovação só aparece depois —
quando já é tarde para negociar de volta.

## O que se espera

A mesma alçada aplicada ao orçamento, antes de o documento poder ser enviado
ao cliente.

## Como saberemos que resolveu

- Orçamento com desconto fora da alçada do vendedor não pode ser enviado.
- As faixas são exatamente as mesmas da proposta — uma regra só, dois objetos.

## Por que ainda não foi feito

Levantado durante a implementação de ORI-1487 e deliberadamente deixado fora
daquele escopo. Depende de uma decisão comercial ainda pendente sobre quem
aprova orçamento de cliente novo.
