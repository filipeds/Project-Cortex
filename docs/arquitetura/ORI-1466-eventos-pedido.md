---
type: arquitetura
title: Platform Events como canal de status do ERP
card: ORI-1466
status: decidida
components: [Pedido__c, StatusPedido__e, PedidoStatusHandler, PendenciaIntegracao__c]
tags: [integracao, platform-events, decisao]
related:
  - ORI-1466-status-pedido
updated: 2026-06-30
---

## Decisão

O ERP publica cada mudança de status como um **Platform Event**. Um handler
inscrito no evento localiza o pedido e aplica o novo status. Evento sem pedido
correspondente vira registro de pendência.

## Por que

A restrição decisiva é a **janela de manutenção diária do ERP**, descrita em
[[ORI-1466-entendimento]]. Qualquer desenho síncrono falharia previsivelmente
todo dia no mesmo horário, e a recuperação teria que ser construída à mão.

Platform Events desacoplam publicação de consumo: durante a janela os eventos
se acumulam e são processados quando o consumo volta, sem que o ERP precise
saber que houve indisponibilidade.

O evento também dá idempotência de graça no nosso caso, porque carrega o status
e a data da mudança — o handler compara com o que já está gravado e descarta o
que for repetido ou fora de ordem.

## O que foi descartado

**Chamada REST síncrona do ERP para o Salesforce a cada mudança.** Simples de
entender, mas transfere para o ERP a responsabilidade de reter e reenviar o que
falhou durante a janela. A camada de integração intermediária não tem fila
própria, então essa retenção teria que ser construída.

**Consulta periódica do Salesforce ao ERP.** Descartada por dois motivos: o
atraso ficaria amarrado ao intervalo da consulta, e consultar todos os pedidos
abertos a cada ciclo desperdiça chamadas para descobrir que quase nada mudou.

**Gravação direta em objeto por integração de dados.** Contornaria a lógica de
validação de ordem dos status, que é justamente o que evita o pedido "voltar"
de expedido para em separação por causa de um evento atrasado.

## Consequências que aceitamos

- Platform Events têm limite de retenção. Uma indisponibilidade do consumo mais
  longa que esse limite perde eventos, e a recuperação seria por carga manual.
- O status no Salesforce é sempre uma cópia. O ERP continua sendo a fonte da
  verdade, e divergência se resolve olhando o ERP.
