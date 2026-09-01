---
type: entrega
title: Alçada automática de desconto em produção
card: ORI-1487
status: em produção
components: [Opportunity, Desconto__c, FaixaAprovacao__c, AprovadorAtual__c, DiscountApprovalService, Flow_AlcadaDesconto, Aprovacao_Desconto]
deployed: 2026-08-19
rollback: desativar Flow_AlcadaDesconto e o Approval Process Aprovacao_Desconto
tags: [opportunity, aprovacao, comercial]
related:
  - ORI-1487-aprovacao-desconto
updated: 2026-08-19
---

## O que foi entregue

- **Approval Process `Aprovacao_Desconto`** com quatro etapas, uma por faixa de
  [[alcada-comercial]], resolvendo aprovador por papel na hierarquia.
- **`Flow_AlcadaDesconto`**, automação de registro que dispara apenas quando o
  desconto muda de valor, e submete a proposta à etapa correspondente.
- **`DiscountApprovalService`**, classe de serviço com o cálculo da faixa,
  isolada para poder ser reaproveitada em ORI-1531.
- **Três campos novos** na proposta: percentual de desconto, faixa resolvida e
  aprovador da vez — este último é o que responde a pergunta "quem está com a
  minha proposta?".

## Como validar em produção

1. Criar proposta de teste com 10% de desconto e salvar. **Esperado:** nenhuma
   solicitação de aprovação, proposta segue livre.
2. Alterar para 18% e salvar. **Esperado:** solicitação criada para o
   Coordenador Comercial; campo de aprovador da vez preenchido.
3. Rejeitar a solicitação. **Esperado:** proposta volta ao estágio anterior e o
   campo de desconto é limpo.
4. Alterar para 45% e salvar. **Esperado:** solicitação para a Diretoria.
5. Aprovar, reabrir a proposta e alterar apenas a descrição. **Esperado:**
   nenhuma nova solicitação — é o cenário do bug
   [[ORI-1487-aprovacao-duplicada]], e é o teste que não pode ser pulado.

## Como reverter

Desativar `Flow_AlcadaDesconto` e o Approval Process `Aprovacao_Desconto`. Os
três campos podem permanecer: sem a automação eles ficam apenas informativos, e
removê-los exigiria uma segunda implantação.

Solicitações de aprovação já abertas no momento da reversão continuam válidas e
precisam ser concluídas manualmente.

## O que ficou de fora

A extensão para orçamentos, levantada durante o desenvolvimento, virou
[[ORI-1531-entendimento]] e não faz parte desta entrega.
