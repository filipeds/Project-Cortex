---
type: entrega
title: Status de pedido sincronizado a partir do ERP
card: ORI-1466
status: em produção
components: [Pedido__c, StatusPedido__e, PedidoStatusHandler, PendenciaIntegracao__c]
deployed: 2026-07-24
rollback: desativar a inscrição no evento StatusPedido__e
tags: [integracao, pedido, platform-events]
related:
  - ORI-1466-status-pedido
updated: 2026-07-24
---

## O que foi entregue

- **Evento `StatusPedido__e`**, com número do pedido, novo status e data da
  mudança no ERP.
- **`PedidoStatusHandler`**, inscrito no evento, que localiza o pedido, valida a
  ordem da mudança e aplica o novo status.
- **`PendenciaIntegracao__c`**, onde caem os eventos de pedidos que o Salesforce
  não conhece, para tratamento posterior sem perda.
- Campo de status e data da última sincronização no pedido.

## Como validar em produção

1. Publicar um evento de teste com status `EM_SEPARACAO` para um pedido
   existente. **Esperado:** status atualizado em menos de 5 minutos.
2. Publicar o mesmo evento de novo. **Esperado:** nenhuma alteração, nenhum log
   novo — a repetição é ignorada.
3. Publicar um evento com data anterior à do status atual. **Esperado:**
   descartado; o pedido não regride de estado.
4. Publicar um evento com número de pedido inexistente. **Esperado:** um
   registro de pendência criado, sem erro.
5. Conferir o comportamento no fim da janela de manutenção do ERP.
   **Esperado:** eventos acumulados processados em lote, sem perda.

## Como reverter

Desativar a inscrição no evento. Os pedidos param de receber atualização e
mantêm o último status conhecido — nenhum dado é perdido, e a retomada
reprocessa a partir dos eventos ainda retidos.

## Efeito colateral esperado

A planilha manual mantida pela logística deixa de ser necessária. A desativação
dela é combinada com a área e não faz parte desta entrega técnica.
