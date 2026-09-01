---
type: spec
title: Alçada de aprovação por faixa de desconto
card: ORI-1487
status: aprovada
reviewer: Coordenação técnica
tags: [opportunity, aprovacao, comercial]
related:
  - alcada-comercial
  - ORI-1487-approval-process
updated: 2026-08-19
---

## Contexto

Hoje toda proposta com desconto acima de 15% cai numa fila manual revisada pelo
gerente comercial, com espera média de 2,8 dias úteis. O levantamento completo
está em [[ORI-1487-entendimento]].

Esta spec define a alçada automática que substitui essa fila. Os percentuais
não são definidos aqui: eles vêm de [[alcada-comercial]], e alterá-los exige
atualizar aquele documento primeiro.

## Comportamento esperado

Ao salvar uma proposta com o campo de desconto preenchido, o sistema calcula a
faixa e submete ao aprovador correspondente. Descontos de até 15% não geram
solicitação alguma — a proposta segue direto.

A avaliação acontece apenas quando o valor do desconto **muda de fato**. Salvar
o registro por qualquer outro motivo não reabre aprovação.

```apex
public static ApprovalTier resolveTier(Decimal desconto) {
    if (desconto == null)  return ApprovalTier.AUTOMATIC;
    if (desconto <= 15)    return ApprovalTier.AUTOMATIC;
    if (desconto <= 25)    return ApprovalTier.COORDINATOR;
    if (desconto <= 40)    return ApprovalTier.MANAGER;
    return ApprovalTier.DIRECTOR;
}
```

## Faixas e aprovadores

| Faixa de desconto | Aprovador | SLA | Automático |
|---|---|---|---|
| Até 15% | — | imediato | Sim |
| 15,01% a 25% | Coordenador Comercial | 4 h | Não |
| 25,01% a 40% | Gerente Comercial | 8 h | Não |
| Acima de 40% | Diretoria Comercial | 24 h | Não |

O aprovador é resolvido pelo papel na hierarquia, não por usuário nomeado. Se o
papel estiver vago, a solicitação sobe para o nível seguinte em vez de falhar.

## Critérios de aceite

- Desconto de exatamente 15,00% não gera solicitação de aprovação.
- Desconto de 15,01% gera solicitação para o Coordenador Comercial.
- Desconto nulo ou vazio é tratado como 0% e não gera solicitação.
- Rejeição devolve a proposta ao estágio anterior e limpa o campo de desconto.
- Reenvio após rejeição cria um novo registro de aprovação; não reaproveita o anterior.
- Alterar qualquer campo que não seja o desconto não reabre aprovação já concluída.
- O histórico de aprovação fica visível na linha do tempo do registro.

## Casos de borda

Dois casos apareceram durante a implementação e estão documentados em
[[ORI-1487-aprovacao-duplicada]]:

1. **Reabertura de proposta já aprovada.** Sem filtro de mudança real no campo,
   a automação reavaliava o registro e disparava a aprovação de novo.
2. **Alteração de valor sem alteração de desconto.** O percentual não muda, mas
   o valor absoluto sim. Por decisão comercial, não reabre aprovação — o que foi
   aprovado é o percentual, não o valor.

Um terceiro caso foi levantado e depende da política de margem mínima descrita
em [[politica-margem-minima]], que ainda não foi escrita.

## Fora de escopo

Aprovação de desconto em orçamento e em contrato de renovação não fazem parte
deste card. Foram levantados no refinamento e viraram [[ORI-1531-entendimento]].
