---
type: entendimento
title: Aprovação automática de desconto acima de 15% em Opportunity
card: ORI-1487
status: concluído
sprint: Sprint 34
tags: [opportunity, aprovacao, comercial]
updated: 2026-07-02
---

## Qual é a dor hoje

Toda proposta com desconto acima de 15% entra numa fila manual revisada pelo
gerente comercial. A fila é uma lista de visualização no Salesforce que ninguém
monitora por padrão — o gerente abre quando lembra, normalmente no fim do dia.

O tempo médio entre o vendedor salvar a proposta e receber uma resposta é de
**2,8 dias úteis**. Em duas medições feitas no trimestre, 63% das propostas
saíram da fila aprovadas sem nenhuma alteração. Ou seja: na maior parte dos
casos a fila só adiciona atraso.

O vendedor, enquanto espera, não tem como saber em que ponto está. A pergunta
"cadê minha aprovação?" é o item mais frequente no canal do time comercial.

## O que se espera

Que o desconto seja avaliado no momento em que a proposta é salva, e roteado
sozinho para quem tem alçada para aprová-lo. Descontos pequenos não deveriam
passar por aprovação nenhuma.

O vendedor precisa enxergar, no próprio registro, em que etapa a aprovação está
e quem é o aprovador da vez.

## Como saberemos que resolveu

- Tempo médio de aprovação cai de 2,8 dias para menos de 8 horas úteis.
- Nenhuma proposta com desconto de até 15% gera solicitação de aprovação.
- O vendedor consegue responder "quem está com a minha proposta?" sem abrir
  chamado nem perguntar no canal.

## O que já sabemos que não muda

As faixas de alçada em si não estão em discussão neste card — elas já existem
e estão descritas em [[alcada-comercial]]. Este card automatiza a aplicação
delas, não redefine os percentuais.
