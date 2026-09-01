---
type: spec
title: Sincronização de status de pedido vinda do ERP
card: ORI-1466
status: aprovada
reviewer: Coordenação técnica
tags: [integracao, pedido, platform-events]
related:
  - ORI-1466-eventos-pedido
updated: 2026-07-08
---

## Contexto

O status real do pedido vive no ERP e não chega ao time comercial sem
intervenção manual. A dor está detalhada em [[ORI-1466-entendimento]].

## Comportamento esperado

O ERP publica um evento a cada mudança de status. O Salesforce consome esse
evento e atualiza o pedido correspondente. Nenhuma tela precisa ser aberta e
nenhum usuário precisa agir.

Quando o evento chega para um pedido que o Salesforce não conhece, ele é
registrado como pendência em vez de ser descartado — o pedido pode ter sido
criado direto no ERP.

## Estados aceitos

| Status no ERP | Status no Salesforce | Encerra o pedido? |
|---|---|---|
| `AGUARDANDO_SEPARACAO` | Aguardando separação | Não |
| `EM_SEPARACAO` | Em separação | Não |
| `FATURADO` | Faturado | Não |
| `EXPEDIDO` | Expedido | Não |
| `ENTREGUE` | Entregue | Sim |
| `CANCELADO` | Cancelado | Sim |

Status fora desta lista é ignorado e registrado no log. A lista cresce por
mudança de spec, nunca por inferência em tempo de execução.

## Critérios de aceite

- Mudança de status no ERP reflete no Salesforce em até 5 minutos.
- Evento repetido para o mesmo status não gera nova atualização nem novo log.
- Evento fora de ordem, com data anterior ao status atual, é descartado.
- Evento para pedido desconhecido vira pendência, não erro silencioso.
- Durante a janela de manutenção do ERP, os eventos acumulam e são processados
  ao final, sem perda.

## Fora de escopo

O caminho inverso — Salesforce publicando para o ERP — não faz parte deste card.
O ERP continua sendo a fonte da verdade sobre o pedido.
