---
type: entendimento
title: Status de pedido do ERP visível dentro do Salesforce
card: ORI-1466
status: concluído
sprint: Sprint 32
tags: [integracao, pedido, platform-events]
updated: 2026-06-11
---

## Qual é a dor hoje

Depois que a proposta vira pedido, o acompanhamento sai do Salesforce. O status
real do pedido — separação, faturamento, expedição — vive no ERP, e o time
comercial não tem acesso a ele.

Na prática o vendedor liga para a central de pedidos ou abre uma planilha que a
logística atualiza duas vezes por dia. As duas fontes divergem com frequência,
porque a planilha é preenchida à mão.

## O que se espera

Que o status do pedido apareça no próprio registro dentro do Salesforce, com
atraso de no máximo alguns minutos em relação ao ERP, e sem ninguém digitar
nada.

## Como saberemos que resolveu

- O vendedor consulta o status sem sair do Salesforce.
- A planilha manual da logística deixa de ser atualizada e é desativada.
- Divergência entre o que o Salesforce mostra e o que o ERP tem: zero.

## Restrições conhecidas

O ERP é acessível apenas por uma camada de integração intermediária, com janela
de manutenção diária. O desenho precisa tolerar essa janela sem perder eventos —
o que empurra a solução para algo assíncrono. A decisão técnica está em
[[ORI-1466-eventos-pedido]].
