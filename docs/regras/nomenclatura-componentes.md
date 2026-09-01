---
type: regra
title: Nomenclatura de componentes do projeto
status: vigente
tags: [meta, convencao, tecnico]
updated: 2026-03-12
---

## A regra

Todo componente criado neste projeto segue um prefixo por natureza, para que
seja possível saber o que uma coisa é apenas pelo nome dela:

| Natureza | Padrão | Exemplo |
|---|---|---|
| Automação de registro | `Flow_<Assunto>` | `Flow_AlcadaDesconto` |
| Classe de serviço | `<Assunto>Service` | `DiscountApprovalService` |
| Classe de tratamento de evento | `<Assunto>Handler` | `PedidoStatusHandler` |
| Regra de validação | `<Assunto>Validation` | `PrecoCongeladoValidation` |
| Processo de aprovação | `Aprovacao_<Assunto>` | `Aprovacao_Desconto` |

Nomes de campos e objetos permanecem em português, acompanhando a linguagem do
negócio. Nomes de classes permanecem em inglês, acompanhando a convenção da
plataforma. A mistura é deliberada.

## Desde quando vale

Vigente desde o início do projeto, em março de 2026. Componentes anteriores a
esta data não existem — não há legado a migrar.

## Quem pode mudar

A coordenação técnica do projeto.

## Por que existe

Sem prefixo, descobrir se `AlcadaDesconto` é uma automação, uma classe ou uma
regra de validação exige abrir o componente. Com centenas de itens, essa
consulta vira o custo dominante de qualquer investigação.

O campo `components` no frontmatter dos documentos de arquitetura e entrega usa
exatamente estes nomes, e é o que permite descobrir todos os cards que tocaram
um mesmo componente.
