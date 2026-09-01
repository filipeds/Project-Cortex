---
type: bug
title: Aprovação disparava duas vezes ao reabrir a proposta
card: ORI-1487
status: resolvido
severity: alta
components: [Opportunity, Flow_AlcadaDesconto]
tags: [opportunity, aprovacao]
related:
  - ORI-1487-aprovacao-desconto
updated: 2026-08-05
---

## Sintoma

Proposta que já tinha passado por aprovação e voltado para edição gerava uma
segunda solicitação de aprovação assim que era salva de novo — mesmo sem
ninguém tocar no desconto.

O aprovador recebia duas notificações do mesmo registro. Aprovar uma delas não
encerrava a outra, e a proposta ficava presa até alguém rejeitar manualmente a
solicitação órfã.

Passos para reproduzir:

1. Criar proposta com 30% de desconto e submeter à aprovação.
2. Aprovar.
3. Reabrir a proposta e alterar qualquer campo que não seja o desconto.
4. Salvar. Uma segunda solicitação aparece.

## Causa raiz

A automação de registro estava configurada para rodar em qualquer atualização,
sem filtro de mudança real no campo de desconto.

O ponto que enganou na primeira leitura: o critério de entrada *verificava* o
valor do desconto — `desconto > 15` — e por isso parecia estar filtrando. Mas
essa condição continua verdadeira depois da aprovação, porque o desconto de 30%
continua lá. O que faltava não era testar o valor, e sim testar se ele **mudou**.

Sem essa distinção, toda atualização de um registro com desconto alto reabria o
processo.

## Correção

Filtro de entrada passou a exigir mudança efetiva do campo, comparando o valor
novo com o anterior, além da condição de faixa que já existia.

A decisão de arquitetura em [[ORI-1487-approval-process]] foi atualizada com
essa consequência, para que quem estender a alçada para outros objetos em
ORI-1531 não repita o erro.

## Por que a spec não pegou isso

A spec original dizia "ao salvar uma proposta com desconto preenchido, submeter
à aprovação". Estava literalmente correta, e foi implementada como escrita.

O critério de aceite que faltava — "alterar qualquer campo que não seja o
desconto não reabre aprovação já concluída" — foi acrescentado a
[[ORI-1487-aprovacao-desconto]] depois deste bug.
