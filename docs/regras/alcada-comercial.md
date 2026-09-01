---
type: regra
title: Alçada comercial por faixa de desconto
status: vigente
tags: [comercial, aprovacao, desconto]
updated: 2026-07-10
---

## A regra

O desconto concedido em qualquer documento comercial determina quem precisa
aprová-lo, segundo quatro faixas fixas:

| Faixa de desconto | Aprovador | SLA de resposta |
|---|---|---|
| Até 15% | nenhum — automático | imediato |
| 15,01% a 25% | Coordenador Comercial | 4 horas úteis |
| 25,01% a 40% | Gerente Comercial | 8 horas úteis |
| Acima de 40% | Diretoria Comercial | 24 horas úteis |

O percentual é calculado sobre o valor de tabela vigente na data de criação do
documento, nunca sobre o valor negociado anteriormente.

## Desde quando vale

Vigente desde abril de 2026. Substituiu o modelo anterior, de duas faixas
(até 20% e acima de 20%), que concentrava tudo acima de 20% na diretoria e
criava gargalo.

## Quem pode mudar

A Diretoria Comercial. Mudança de percentual exige atualizar **este documento
primeiro** — as automações leem as faixas daqui, e qualquer alteração em código
sem a atualização correspondente aqui é considerada divergência.

## Onde está implementada

A aplicação automática desta regra na proposta está em
[[ORI-1487-aprovacao-desconto]]. A extensão para orçamentos está prevista em
ORI-1531, ainda não implementada.

## Casos que a regra não cobre

- Desconto em contrato de renovação, que segue política própria de retenção.
- Bonificação em produto, que não é desconto e não passa por esta alçada.
