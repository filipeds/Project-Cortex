# Histórico de documentação: quem alterou e o que mudou

## Contexto

O fluxo do time já garante que `docs/_site/` nunca fica desatualizado: o hook
de `pre-commit` roda `doczilla build --verificar` e regenera o site antes de
cada commit (`FLUXO-DA-EQUIPE.md`). O que falta é visibilidade: quem leu a
wiki não sabe quem mexeu por último nem consegue ver, de forma rápida, o que
foi acrescentado à documentação ao longo do tempo. Hoje a única pista de
"quando" é o carimbo no rodapé, derivado do campo `updated` mais recente entre
os documentos — e ele não diz **quem**.

Esta mudança acrescenta uma página **Histórico** à wiki gerada, e uma linha de
autoria no rodapé de toda página, usando o histórico de commits do próprio
git como fonte — sem exigir nenhum campo novo no frontmatter nem nenhuma
digitação manual de quem escreve.

## Objetivo

- Rodapé de toda página mostra quem fez a última alteração em `docs/` e
  quando: `"última atualização por Maria em 02/09"`.
- Nova página `historico.html`, sempre presente no menu, lista em ordem
  cronológica (mais recente primeiro) cada documento criado ou editado, com
  autor e data, linkando para o documento.
- Nada disso pode quebrar o build quando não há repositório git disponível
  (clone raso, pasta fora de um repo, git não instalado): degrada em
  silêncio, sem lançar erro.

## Fora de escopo (YAGNI)

- Autoria por documento na própria página do documento — só a lista central
  em Histórico.
- Distinguir rename de edição no git (os dois viram "editou").
- Filtro ou busca dentro da página Histórico.
- Flag de CLI para ligar/desligar o recurso — ele já degrada sozinho.

## Arquitetura

### `src/historico.js` (novo)

Módulo isolado do pipeline `load → graph → validate → render`: não lê nem
altera nada dessas etapas, só pergunta ao git o que aconteceu nos caminhos de
`docs/`. Isso preserva o invariante existente de que um build da `docs/` de
demonstração sai byte a byte igual, fora das páginas que este trabalho
deliberadamente muda (rodapé de todas, e a página nova).

```js
export async function obterHistoricoGit({ raiz, raizes }) {
  // 1. `git -C <raiz> rev-parse --show-toplevel` — confirma que é repo git.
  //    Falha (ENOENT do binário, não é repo) => devolve indisponível.
  // 2. `git -C <raiz> log --name-status --pretty=format:"@@%H|%an|%ad" \
  //      --date=short -- <raizes.abs...>`
  // 3. Parseia em entradas { autor, data, acao, absPath }, resolvendo o
  //    caminho do git (relativo ao toplevel) para absoluto, para casar com
  //    `doc.absPath` do grafo (mesma identidade que graph.js já usa para
  //    resolver link relativo).
  //    status 'A' -> acao 'criou'; qualquer outro (M/R/C/T) -> 'editou'.
  return {
    disponivel: true | false,
    ultimaAlteracao: { autor, data } | null,
    entradas: [{ autor, data, acao, absPath }],
  };
}
```

Qualquer erro (comando falha, git ausente, parse inesperado) é capturado
dentro da função: ela nunca lança, só devolve `{ disponivel: false }`.

### `build.js`

Recebe `obterHistorico` como parâmetro opcional (mesmo padrão já usado por
`carimboTexto`), com a chamada real de `historico.js` como default:

```js
export async function build({
  ...,
  obterHistorico = obterHistoricoGit,
} = {}) { ... }
```

Depois de montar o `grafo`, casa cada `entrada.absPath` do histórico com
`grafo.doc` por `doc.absPath`. Entrada sem doc correspondente (arquivo
apagado, movido para fora das raízes lidas) é descartada — não há para onde
linkar. O resultado (`ultimaAlteracao`, lista de entradas já casadas com
`doc.href`/`doc.title`) entra em `projeto.historico`, ao lado dos outros
campos computados de `projeto`.

Isso é o que torna o módulo testável sem tocar em git de verdade: um teste
que compara HTML byte a byte passa um `obterHistorico` fake e fixo, então
nunca embute nome ou data de commit real deste repositório no fixture, e não
quebra em clone raso nem em CI de outro ambiente.

### Determinismo

Para o mesmo `HEAD`, `git log` devolve sempre a mesma saída — então dois
builds seguidos sem novo commit continuam produzindo bytes idênticos, a
mesma garantia que `carimbo()` já tem hoje, só que a fonte passa a ser o git
em vez do frontmatter. Isto foi confirmado com o usuário antes deste spec
(ver checklist de determinismo em `CLAUDE.md`).

**Limitação conhecida:** como o hook roda o build **antes** do commit
existir, o histórico gerado num commit sempre reflete o `HEAD` anterior — a
autoria do commit que está sendo feito só aparece na wiki no próximo build.
Isso é aceitável: autocorrige no ciclo seguinte e é inerente a "gerar antes
de committar".

### Degradação sem git

`disponivel: false` propaga para `projeto.historico.disponivel`:

- Rodapé usa o carimbo atual (só data, sem autor) — comportamento de hoje,
  inalterado.
- Página Histórico mostra um estado vazio amigável (`<div class="vazio">`,
  mesmo padrão usado em "nenhum card ainda"), explicando que o histórico
  depende de um repositório git.
- O build não lança erro nem entra em `avisos` — não é um defeito de
  documento, é ausência de um dado opcional.

## Renderização

### Rodapé (`layout.js`, `rodape()`)

Quando `projeto.historico?.disponivel`, a linha de rodapé troca o texto do
carimbo por `"última atualização por ${autor} em ${data}"`. O eyebrow da
home (hero) **não muda** — ele responde uma pergunta diferente ("os
documentos mais novos são de quando", derivado de conteúdo) da que o rodapé
passa a responder ("quem mexeu por último", derivado de git).

### Página Histórico (`historico.html`, novo em `render/pages-extra.js` ou
arquivo próprio `render/pages-historico.js` — decidido na hora de escrever
o código, conforme o tamanho do resultado)

Nova entrada em `PAGINAS` (`layout.js`), sempre visível — diferente do Mapa,
que só existe no regime `descoberto`. Lista cronológica, reaproveitando o
padrão visual `hlist`/`hrow` já usado na lista de avisos da home:

```
Maria editou spec-ori-1487.md · 02/09
João criou bug-duplicidade-anexo.md · 30/08
Maria criou spec-ori-1487.md · 28/08
```

Cada linha linka para `doc.href`. Corta em 40 entradas com uma linha final
"e mais N" quando passa disso — mesmo padrão de `listaAvisos` em
`pages-home.js` (que corta em 12).

## Testes

- `historico.js` testado isoladamente: parse da saída de `git log
  --name-status` (formato fixo, dado como string de entrada no teste — sem
  chamar git de verdade) cobrindo criação, edição, arquivo fora de `docs/`
  descartado, e o caso `disponivel: false`.
- `build()` testado com `obterHistorico` fake, cobrindo: histórico presente
  (rodapé e página mudam), histórico ausente (rodapé e página caem no
  estado atual/vazio).
- Fixtures existentes em `test/fixtures/legado/_site/` são regeneradas com
  um `obterHistorico` fake fixo (não com git real), para o snapshot
  continuar hermético.
- Depois de implementado: build real da `docs/` de demonstração, para
  confirmar visualmente rodapé e página Histórico com os commits reais deste
  repositório, e o resultado é commitado em `docs/_site/` seguindo o mesmo
  fluxo de `FLUXO-DA-EQUIPE.md`.
