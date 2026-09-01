---
type: arquitetura
title: Por que Approval Process nativo e não automação em Apex
card: ORI-1487
status: decidida
components: [Opportunity, Desconto__c, DiscountApprovalService, Flow_AlcadaDesconto, Aprovacao_Desconto]
tags: [opportunity, aprovacao, decisao]
related:
  - ORI-1487-aprovacao-desconto
updated: 2026-07-15
---

## Decisão

A alçada usa o **Approval Process nativo da plataforma**, acionado por uma
automação de registro que só dispara quando o desconto muda. O cálculo da faixa
fica numa classe de serviço, chamada pela automação.

## Por que

O critério que pesou foi **rastreabilidade sem código**. O Approval Process já
entrega histórico de aprovação, delegação, escalonamento por hierarquia e a
visualização de etapas dentro do registro — tudo isso é exatamente o que o
vendedor pediu quando disse que quer saber "quem está com a minha proposta".

Reimplementar isso em Apex significaria escrever e manter um modelo de histórico
próprio, que ficaria pior do que o nativo e precisaria de tela nova.

A faixa fica em Apex, e não dentro do critério de entrada do Approval Process,
por um motivo específico: a regra de faixas é compartilhada com outros objetos
no futuro (ORI-1531). Deixá-la numa classe de serviço permite reaproveitar sem
duplicar percentuais em dois lugares.

## O que foi descartado

**Automação declarativa pura, sem Apex.** Funcionaria para as quatro faixas
atuais, mas os percentuais ficariam escritos dentro do critério de entrada.
Estender para orçamento exigiria replicar os mesmos números numa segunda
automação — e a chance de as duas saírem do ar em momentos diferentes é alta.

**Fluxo de aprovação inteiramente em Apex.** Dá controle total, mas obriga a
construir histórico, notificação e tela de aprovação do zero. O custo não se
justifica quando o nativo cobre o caso.

**Aprovação por integração com ferramenta externa.** Descartado por adicionar
uma dependência de rede a um fluxo que precisa funcionar dentro do CRM, e por
tirar o histórico de dentro do registro.

## Consequências que aceitamos

- O Approval Process nativo tem limite de etapas por processo. As quatro faixas
  cabem folgadamente, mas uma quinta faixa exigiria revisitar o desenho.
- O critério de entrada precisa de filtro de mudança real no campo de desconto.
  Esquecer esse filtro causa aprovação duplicada — foi exatamente o que
  aconteceu, e está registrado em [[ORI-1487-aprovacao-duplicada]].
