---
type: bug
title: Chamado duplicado em resposta de e-mail com anexo
status: em análise
severity: media
components: [Case, Flow_RoteamentoCase]
tags: [case, roteamento, email-to-case]
updated: 2026-08-21
---

## Sintoma

Resposta de cliente a um e-mail de chamado, quando vem com arquivo anexado,
gera dois registros de chamado em vez de um. Sem anexo, gera apenas um.

Os dois registros nascem com poucos segundos de diferença, mesmo remetente e
mesmo assunto. O anexo fica em apenas um deles.

## O que já foi verificado

- Não é duplicidade de envio do cliente: o servidor de e-mail registra uma
  única mensagem recebida.
- Não acontece com anexo de qualquer tamanho — as ocorrências observadas até
  agora envolvem arquivos acima de 3 MB.
- A automação de roteamento roda duas vezes nos casos duplicados, segundo o
  log, mas ainda não sabemos o que a dispara na segunda vez.

## Hipótese atual

A mensagem com anexo grande parece ser processada em duas etapas — corpo
primeiro, anexo depois — e a segunda etapa estaria sendo tratada como uma nova
mensagem. Ainda **não confirmado**: falta reproduzir em ambiente controlado com
anexo grande.

## Próximo passo

Reproduzir com arquivo de 5 MB em sandbox e capturar o log completo das duas
execuções. Enquanto a causa não estiver confirmada, não faz sentido escrever a
spec da correção — o levantamento do card está em [[ORI-1502-entendimento]].
