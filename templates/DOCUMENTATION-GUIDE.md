---
type: regra
title: Padrão de documentação do projeto
status: vigente
tags: [meta, padrao]
updated: 2026-08-24
---

Este documento é a instrução para quem escreve documentação aqui — pessoa ou IA.
Ele é lido pelo Doczilla, que transforma esta pasta numa wiki navegável.

**Se você é um assistente de IA trabalhando neste repositório: leia este arquivo
antes de criar qualquer documento em `docs/`, e siga o padrão exatamente.** Um
documento fora do padrão não quebra o build, mas fica solto na wiki e aparece na
lista de avisos.

## A regra de ouro

Todo arquivo `.md` dentro de `docs/` começa com um bloco de frontmatter. É esse
bloco — e não a pasta onde o arquivo está — que define o que o documento é.

```markdown
---
type: spec
title: Alçada de aprovação por faixa de desconto
card: ABC-1487
status: aprovada
tags: [opportunity, aprovacao]
related:
  - alcada-comercial
updated: 2026-08-19
---
```

## Campos obrigatórios em todo documento

| Campo | O que é | Exemplo |
|---|---|---|
| `type` | Um dos seis tipos abaixo. Sem inventar novos. | `spec` |
| `title` | Título em linguagem de gente, não o nome do arquivo. | `Alçada de aprovação por faixa de desconto` |
| `status` | Onde o documento está. Vocabulário livre. | `aprovada`, `em análise`, `resolvido` |
| `updated` | Data da última alteração, em `AAAA-MM-DD`. | `2026-08-19` |

## Os seis tipos

### `entendimento` → `docs/cards/`

O que o card pede, na linguagem do negócio. Escrito **antes** de qualquer linha
de código. Se você não consegue escrever isto, você ainda não entendeu o card.

- Obrigatório além dos comuns: `card`
- Responde: qual é a dor hoje, o que o usuário espera, como saberemos que resolveu

### `spec` → `docs/specs/`

O contrato do que será entregue: comportamento esperado, critérios de aceite e
casos de borda. É o documento mais consultado depois que o card fecha.

- Obrigatório além dos comuns: `card`
- Responde: o que exatamente o sistema faz, em que condições, e o que não faz

### `arquitetura` → `docs/arquitetura/`

A decisão técnica **e o porquê dela** — incluindo o que foi descartado. Sem o
"porquê", o documento envelhece mal e ninguém sabe se pode mudar.

- Obrigatório além dos comuns: `card`, `components`
- Responde: qual caminho foi escolhido, quais foram descartados e por quê

### `bug` → `docs/bugs/`

Sintoma, causa raiz e correção. **Fica no ar mesmo depois de resolvido**: é
memória do time, não um ticket.

- Obrigatório além dos comuns: `card`, `severity`
- Responde: o que o usuário viu, por que acontecia de verdade, o que mudou

### `entrega` → `docs/entregas/`

O que foi de fato desenvolvido, onde, e como validar. Escrito no fim, com o que
realmente foi para o ar — não com o que estava planejado.

- Obrigatório além dos comuns: `card`, `components`, `deployed`
- Responde: quais componentes mudaram, como validar em produção, como reverter

### `regra` → `docs/regras/`

Regra de negócio que atravessa vários cards. **Não tem `card`** — é referenciada
por eles. Se a regra pertence a um card só, ela provavelmente é uma spec.

- Nenhum campo obrigatório além dos comuns
- Responde: qual é a regra, desde quando vale, quem pode mudá-la

## Campos opcionais úteis

| Campo | Onde se aplica | Formato |
|---|---|---|
| `tags` | qualquer | lista: `[opportunity, integracao]` |
| `related` | qualquer | lista de ids de outros documentos |
| `components` | arquitetura, entrega, bug | lista de componentes tocados |
| `severity` | bug | `baixa`, `media`, `alta`, `critica` |
| `deployed` | entrega | data em `AAAA-MM-DD` |
| `sprint` | entendimento | texto livre |
| `reviewer` | spec | quem revisou |
| `rollback` | entrega | como reverter, em uma linha |

## Como ligar documentos

Existem dois mecanismos, e eles servem a propósitos diferentes.

**1. Pelo card — automático.** Todo documento que declara o mesmo `card` aparece
junto na página daquele card, em ordem: entendimento, spec, arquitetura, bug,
entrega. Você não escreve link nenhum para isso acontecer.

**2. Por wikilink — manual.** Dentro do texto, `[[nome-do-arquivo]]` cria uma
ligação para outro documento. O nome é o do arquivo **sem a extensão `.md`**.

```markdown
As faixas seguem a regra descrita em [[alcada-comercial]].
Para trocar o rótulo: [[alcada-comercial|a regra de alçada]].
```

O documento apontado ganha automaticamente um **backlink** de volta. Wikilink
que não resolve vira aviso no build — o nome precisa bater com um arquivo real.

## Nome de arquivo

- Documento ligado a um card: `<CARD>-<assunto-curto>.md` — ex.: `ABC-1487-aprovacao-desconto.md`
- Regra de negócio: `<assunto>.md` — ex.: `alcada-comercial.md`
- Sempre minúsculas, sem acento, separado por hífen. É esse nome que vai dentro de `[[...]]`.

## Escrevendo o corpo

- Comece por `##`. O `title` do frontmatter já é o `<h1>` da página.
- Um assunto por seção. Seções viram o sumário lateral automaticamente.
- Prefira tabela a lista quando houver mais de dois eixos de informação.
- Blocos de código levam a linguagem: ```apex, ```sql, ```json.
- Escreva o que é verdade hoje. Documento não é diário de bordo.

## O que não fazer

- Não inventar `type` novo — o build rejeita e o documento fica órfão.
- Não pôr `card` em documento do tipo `regra`.
- Não escrever `[[link]]` para arquivo que ainda não existe.
- Não copiar dados reais de cliente, credencial, endpoint de produção ou nome de
  pessoa física para dentro de exemplo. Exemplo é sempre dado fictício.
