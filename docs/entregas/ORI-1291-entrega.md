---
type: entrega
title: Congelamento de preço em proposta assinada
card: ORI-1291
status: em produção
components: [Opportunity, Assinada__c, PrecoCongeladoValidation, Flow_ReversaoNegociacao]
deployed: 2026-05-21
rollback: desativar a regra de validação PrecoCongeladoValidation
tags: [opportunity, preco, contrato]
related:
  - congelamento-preco
updated: 2026-05-21
---

## O que foi entregue

- **Regra de validação `PrecoCongeladoValidation`**, que bloqueia alteração de
  valor e desconto quando a proposta está assinada. Vale para edição manual,
  carga em massa e automação — foi por essa última que o problema original
  entrou.
- **`Flow_ReversaoNegociacao`**, o caminho explícito de exceção: reverte a
  proposta para negociação registrando autor e data.
- Campo indicando se a proposta está assinada, com a data da assinatura.

## Como validar em produção

1. Marcar uma proposta de teste como assinada.
2. Tentar alterar o valor. **Esperado:** bloqueio com mensagem explicando o
   motivo e apontando o caminho de reversão.
3. Rodar uma atualização em massa que inclua essa proposta. **Esperado:** os
   demais registros são atualizados e este é ignorado, aparecendo no resultado
   da operação — não pode falhar em silêncio.
4. Reverter para negociação. **Esperado:** campos voltam a ser editáveis e a
   reversão fica registrada.
5. Conferir que proposta não assinada continua totalmente editável.

## Como reverter

Desativar a regra de validação. O campo de assinatura e o fluxo de reversão
podem permanecer sem efeito colateral.

## Consequência para o projeto

Esta entrega deu origem à regra [[congelamento-preco]], que passou a valer para
todo o projeto e é referenciada por outros cards.
