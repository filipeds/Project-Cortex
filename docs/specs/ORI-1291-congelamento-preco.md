---
type: spec
title: Bloqueio de alteração de preço em proposta assinada
card: ORI-1291
status: aprovada
tags: [opportunity, preco, contrato]
related:
  - congelamento-preco
updated: 2026-05-06
---

## Contexto

Reajuste de tabela em massa já alterou o valor de propostas assinadas, criando
divergência entre o documento do cliente e o sistema. O caso está em
[[ORI-1291-entendimento]].

## Comportamento esperado

A partir do momento em que a proposta é marcada como assinada, os campos de
valor e desconto ficam bloqueados para qualquer edição — manual, em massa ou
por automação.

O bloqueio não é apenas de interface: ele vale também para atualizações vindas
de importação e de processos automáticos, que é por onde o problema entrou.

## Caminho legítimo de exceção

Renegociação de proposta assinada existe e é válida. Ela passa por um caminho
explícito: a proposta é revertida para o estágio de negociação, o que registra
autor e data, e só então os campos voltam a ser editáveis.

Reverter uma proposta assinada exige o mesmo nível de alçada que aprovaria o
desconto dela, conforme [[alcada-comercial]].

## Critérios de aceite

- Edição manual de valor em proposta assinada é bloqueada com mensagem clara.
- Atualização em massa não altera proposta assinada e não falha silenciosamente:
  os registros ignorados aparecem no resultado da operação.
- Reversão para negociação registra quem reverteu e quando.
- Proposta não assinada continua totalmente editável.

## Fora de escopo

Congelamento de itens de produto individuais dentro da proposta. Este card trata
do valor e do desconto no cabeçalho.
