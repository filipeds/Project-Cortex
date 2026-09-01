# Doczilla

Gera uma wiki estática e offline a partir da pasta `docs/` de um projeto.

Você escreve Markdown com um bloco de frontmatter no topo. O Doczilla lê tudo,
descobre o tipo de cada documento, reconstrói as ligações entre eles e cospe um
site HTML que abre com duplo clique — sem servidor, sem rede, sem build tool.

Feito para projetos Salesforce, onde a pasta `docs/` convive com milhares de
arquivos de metadados: o Doczilla olha apenas para `docs/` e nunca toca no resto.

## Comece aqui

Não há pacote publicado: o Doczilla se instala copiando o código para dentro
do repositório onde vai ser usado (ver [Segurança e uso em repositório
corporativo](#segurança-e-uso-em-repositório-corporativo)). Só devs rodam os
comandos abaixo — o resto do time só lê o site gerado.

```bash
node bin/doczilla.js init     # cria docs/ com o padrão e um exemplo de cada tipo
node bin/doczilla.js build    # gera o site em docs/_site/
node bin/doczilla.js serve    # servidor local com recarga automática, para escrever
```

(Se você copiou a ferramenta para `ferramentas/doczilla/` dentro do seu
projeto, o caminho é `node ferramentas/doczilla/bin/doczilla.js`.)

Se o projeto **já tem** documentação em Markdown, comece por
`node bin/doczilla.js analisar` — a ferramenta lê a organização que já existe
antes de propor qualquer coisa. Veja [Num projeto que já tem
documentação](#num-projeto-que-já-tem-documentação).

Abra `docs/_site/index.html` no navegador. É um arquivo comum: funciona em
`file://`, sem instalar nada.

## A ideia

**O card é o eixo.** Todo documento declara a que card pertence. A página do
card reúne sozinha o entendimento, a spec, a decisão de arquitetura, a
investigação de bug e a entrega — em ordem, sem ninguém escrever um link.

**Wikilinks para o resto.** Dentro do texto, `[[nome-do-arquivo]]` liga a
qualquer outro documento, e o destino ganha um backlink de volta.

**O padrão é fixo.** São seis tipos, com campos obrigatórios definidos. É isso
que permite apontar o `CLAUDE.md` para um único documento de instrução e ter
documentação nascendo no formato certo em todos os projetos.

## Os seis tipos

| Tipo | Pasta sugerida | Para quê |
|---|---|---|
| `entendimento` | `docs/cards/` | O que o card pede, na linguagem do negócio |
| `spec` | `docs/specs/` | Comportamento esperado e critérios de aceite |
| `arquitetura` | `docs/arquitetura/` | A decisão técnica e o porquê dela |
| `bug` | `docs/bugs/` | Sintoma, causa raiz e correção |
| `entrega` | `docs/entregas/` | O que foi para produção e como validar |
| `regra` | `docs/regras/` | Regra que atravessa vários cards |

A pasta organiza para quem lê no editor; quem manda é o campo `type` no
frontmatter. Mover um arquivo não quebra nada.

O padrão completo, com todos os campos, está em
[`templates/DOCUMENTATION-GUIDE.md`](templates/DOCUMENTATION-GUIDE.md) — o mesmo
arquivo que o `init` copia para dentro do seu projeto.

## Um documento por dentro

```markdown
---
type: spec
title: Alçada de aprovação por faixa de desconto
card: ORI-1487
status: aprovada
tags: [opportunity, aprovacao]
related:
  - alcada-comercial
updated: 2026-08-19
---

## Contexto

As faixas seguem a regra descrita em [[alcada-comercial]].
```

## Validação

O build **avisa, mas não falha**. Campo esquecido, wikilink quebrado ou card sem
spec aparecem no terminal e numa tela de saúde dentro da wiki — e o site é
gerado do mesmo jeito. Ninguém fica sem documentação por causa de um metadado.

Para o CI, `build --strict` transforma avisos críticos em erro.

## Num projeto que já tem documentação

`init` serve para começar do zero. Num repositório que já acumulou `.md` — em
uma pasta ou em várias, com organização própria — o caminho é a pré-leitura:

```bash
node bin/doczilla.js analisar              # lê o projeto e propõe um perfil
node bin/doczilla.js analisar --escrever   # grava o perfil no doczilla.config.json
node bin/doczilla.js build
```

`analisar` varre o repositório, mostra cada pasta que contém `.md` com quantos
arquivos tem e quantos já trazem frontmatter, descobre o que agrupa os
documentos e de que jeito eles se referenciam. Não escreve documento nenhum: a
proposta vai para a tela, e só com `--escrever` chega ao `doczilla.config.json`.

O que o perfil descreve — e nada além disso:

```json
{
  "perfil": {
    "raizes": [
      { "caminho": ".", "rotulo": "Raiz do projeto", "profundidade": 1 },
      { "caminho": "docs", "rotulo": "Documentação" },
      { "caminho": "adr", "rotulo": "Decisões", "tipoPadrao": "arquitetura" }
    ],
    "eixo": { "modo": "chave", "padrao": "[A-Z]{2,6}-\\d+", "rotulo": "Card" },
    "ligacoes": { "relativos": true, "campos": ["parent", "epic"] },
    "ignorar": ["CHANGELOG.md"]
  }
}
```

Com perfil, quatro coisas mudam:

- **Várias raízes.** Documentação espalhada por `docs/`, `adr/` e o `README.md`
  da raiz entra na mesma wiki. `profundidade` limita o quanto se desce numa
  raiz — é o que permite pegar o README de cima sem varrer o repositório.
- **O eixo deixa de ser só o card.** `chave` agrupa pela marca que se repete no
  nome dos arquivos (`ORI-1487`, `ADR-0007`); `pasta` agrupa pela árvore de
  diretórios, e sempre funciona. Toda a wiki passa a chamar o grupo pelo nome
  que o projeto usa.
- **Link relativo vira ligação.** `[texto](../adr/0001.md)` gera saída e
  backlink como um `[[wikilink]]`, e na página passa a apontar para o documento
  de destino em vez de para um arquivo que não existe na saída.
- **Legado não vira erro.** Arquivo sem frontmatter aparece na wiki e na busca,
  e a tela de saúde troca o muro de críticos por uma linha de progresso de
  adoção. Uma tela nova, **Mapa**, mostra o que a pré-leitura entendeu.

Nada disso mexe nos seis tipos nem nos campos obrigatórios. O perfil diz **onde
ler**, **como agrupar** e **o que conta como ligação** — só.

## Configuração

Opcional. Um `doczilla.config.json` na raiz muda apenas cosmética e caminhos:

```json
{
  "nome": "Projeto Órion",
  "plataforma": "Salesforce Sales Cloud",
  "docs": "docs"
}
```

Os tipos e seus campos obrigatórios **não** são configuráveis. É de propósito:
sem isso, cada projeto vira um dialeto e a instrução dada à IA deixa de valer
em todos eles.

## Segurança e uso em repositório corporativo

Zero dependências de runtime, nenhum acesso à rede, nenhuma execução de código
vindo de documento, e leitura restrita às pastas declaradas.

[`SEGURANCA.md`](SEGURANCA.md) traz a auditoria completa — o que foi encontrado
e corrigido, os riscos residuais, e a única forma de instalar usada aqui:
copiar o código para dentro do repositório, sem registro de pacotes e sem
dependência de git.

## Desenvolvimento

Zero dependências de runtime. Parser de frontmatter, renderer Markdown e gerador
de site são próprios, para que instalar o Doczilla num projeto Salesforce não
signifique arrastar uma árvore de `node_modules` junto. Requer Node 18+.

Este repositório traz uma `docs/` de demonstração — o "Projeto Órion", um
projeto Salesforce **fictício**, com dados inventados. Ela inclui defeitos
propositais (um wikilink quebrado, um documento sem `card`, cards sem spec) para
exercitar a validação.
