---
type: entendimento
title: Chamados duplicados quando o cliente responde com anexo
card: ORI-1502
status: em análise
sprint: Sprint 35
tags: [case, roteamento, email-to-case]
updated: 2026-08-14
---

## Qual é a dor hoje

O time de atendimento relata que alguns chamados aparecem duplicados na fila:
dois registros, mesmo assunto, mesmo cliente, criados com poucos segundos de
diferença.

O padrão que o time percebeu é que acontece quando o cliente responde ao e-mail
do chamado **com um arquivo anexado**. Resposta sem anexo não duplica.

O impacto é dois atendentes trabalharem no mesmo caso sem saber, e o indicador
de volume de chamados ficar inflado.

## O que se espera

Um chamado por solicitação do cliente, com o anexo preservado, independente de
como a resposta chega.

## Como saberemos que resolveu

- Resposta com anexo gera exatamente um registro.
- O anexo continua acessível a partir do chamado.
- O volume de chamados do mês volta ao patamar anterior ao problema.

## O que ainda não sabemos

A causa raiz ainda está em investigação — o levantamento está em
[[duplicidade-case-anexo]]. Até entendermos por que acontece, não faz sentido
escrever a spec da correção.
