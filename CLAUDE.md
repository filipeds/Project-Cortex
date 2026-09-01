# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

O Doczilla é uma CLI que lê a pasta `docs/` de um projeto e gera uma wiki
estática e offline. Este repositório é **a ferramenta**, e traz também uma
`docs/` de demonstração (o "Projeto Órion", fictício) que serve de fixture
manual e de vitrine.

Comentários, mensagens de erro, nomes de função e conteúdo gerado são em
português. Identificadores exportados também (`montarGrafo`, `carregarDocumentos`).
Mantenha isso ao acrescentar código.

## Comandos

```bash
npm test                                  # 83 testes (node --test), sem watch
node --test test/markdown.test.js         # um arquivo só
node bin/doczilla.js build                # gera docs/_site/ e imprime os avisos
node bin/doczilla.js build --strict       # sai com erro se houver aviso crítico
node bin/doczilla.js build --verificar    # não escreve: sai com erro se _site/ estiver fora de dia
node bin/doczilla.js serve                # http://localhost:4321 com live reload
node bin/doczilla.js init --dir <x>       # scaffold do padrão noutro projeto
node bin/doczilla.js analisar --dir <x>   # pré-leitura: propõe o perfil de um projeto existente
node bin/doczilla.js build --dir test/fixtures/legado   # o fixture brownfield
```

Não há lint nem build step — é ESM puro rodando direto no Node 18+.

## Restrição central: zero dependências

A ferramenta é instalada dentro de repositórios Salesforce, onde arrastar
`node_modules` é caro e politicamente difícil. Por isso o parser de frontmatter
(`src/frontmatter.js`), o renderer Markdown (`src/markdown.js`) e o gerador de
HTML são escritos à mão.

**Não adicione dependências de runtime.** Se precisar de algo que uma lib
resolveria, escreva a fatia mínima do problema. O `package.json` não tem
`dependencies` e deve continuar assim.

## Os dois regimes

A ferramenta atende dois tipos de projeto, e a diferença atravessa quase todo
módulo. O que decide é a existência do bloco `perfil` no `doczilla.config.json`
(`config.js` devolve `regime`):

- **`padrao`** — sem `perfil`. O projeto nasceu com o Doczilla: uma pasta
  `docs/`, o eixo é o campo `card`, documento fora do padrão é crítico. É o
  caminho de código original, e **ele não pode mudar**.
- **`descoberto`** — com `perfil`, escrito por `doczilla analisar` e revisado
  por gente. O projeto já tinha documentação antes: várias raízes, eixo
  inferido, link relativo virando ligação, legado virando observação agregada.

**Invariante de trabalho:** um build da `docs/` de demonstração precisa sair
byte a byte igual ao anterior, fora o carimbo de horário. Antes de mexer em
`load/graph/validate/render`, guarde uma cópia de `docs/_site/`, refaça o build
e compare. Se alguma página mudou, o regime padrão vazou.

O `perfil` diz **onde ler** (`raizes`, com `profundidade` e `tipoPadrao`),
**como agrupar** (`eixo.modo`: `card` · `chave` · `pasta`) e **o que conta como
ligação** (`ligacoes.relativos`, `ligacoes.campos`). Ele nunca inventa tipo nem
campo obrigatório — isso continua sendo só de `schema.js`.

## Arquitetura: o pipeline

O build é uma cadeia linear, orquestrada em `src/build.js`:

```
analisar (opcional, fora do build)  →  perfil no doczilla.config.json
    (analyze.js)

carregarDocumentos  →  montarGrafo  →  validar  →  render*  →  escrita em _site/
    (load.js)          (graph.js)    (validate.js)  (render/)
```

1. **`load.js`** varre `docs/**/*.md` e devolve um objeto por arquivo. Nada é
   descartado aqui — arquivo sem frontmatter ou com tipo inválido também vira
   documento, para que a validação possa reclamar dele depois.
2. **`graph.js`** resolve as ligações e é onde mora a ideia do produto (abaixo).
3. **`validate.js`** produz avisos. **Nunca lança.** O site sai sempre.
4. **`render/`** transforma o grafo em páginas HTML.

`src/schema.js` é a fonte da verdade do padrão: os seis tipos, seus campos
obrigatórios, a ordem na trilha do card e o token de cor de cada um. Mexer nos
tipos começa por lá, e `templates/DOCUMENTATION-GUIDE.md` precisa acompanhar —
os dois descrevem o mesmo contrato para leitores diferentes (código e IA).

## As naturezas de ligação

Essa distinção atravessa `graph.js`, a página do card e o grafo. Preserve-a:

- **Por grupo** — inferida do eixo. No regime padrão o eixo é o campo `card`;
  no descoberto pode ser uma chave no nome do arquivo ou a própria pasta.
  Documentos do mesmo grupo se juntam sozinhos, ordenados por
  `TIPOS[type].order`. Ninguém escreve link para isso funcionar. É a espinha
  dorsal da navegação. `chaveDoEixo()` é o único lugar que decide isso.
- **Por wikilink** — `[[nome-do-arquivo]]` escrito no corpo. Gera `saidas` na
  origem e `entradas` (backlinks) no destino. Wikilink que não resolve entra em
  `doc.quebrados` e vira aviso crítico **nos dois regimes**: alguém escreveu
  esperando chegar a um documento.
- **Por link relativo** — `[texto](../adr/0001.md)`, só quando
  `ligacoes.relativos` está ligado. Vira a mesma aresta que o wikilink, e no
  HTML o href é trocado pela página de destino (senão apontaria para um arquivo
  que não existe na saída plana). Link que não resolve é `info`, não crítico:
  pode legitimamente apontar para fora das raízes lidas.

Regras de negócio (`type: regra`) deliberadamente **não têm card**. Elas só se
conectam por wikilink, e `regrasDoCard()` as encontra atravessando as saídas dos
documentos do card.

A resolução de nomes é tolerante a caixa e acento (`chaveBusca` em `graph.js`),
então `[[Alçada Comercial]]` acha `alcada-comercial.md`. Há índices secundários
por título e por caminho, para casar wikilinks escritos por extenso e links
relativos vindos de outra raiz.

**Identidade do documento.** O `id` é o nome do arquivo. Dois arquivos com o
mesmo nome se comportam diferente por regime: no padrão o segundo é descartado
e vira crítico (`grafo.duplicados`); no descoberto ele ganha a pasta na frente
(`api/README`) e entra em `grafo.qualificados`. Repositório real tem muito
`README.md`, e perder documento é pior do que renomeá-lo.

## Restrições da saída

O site precisa abrir por duplo clique, em `file://`, sem rede:

- **Nenhuma requisição externa.** Sem CDN, sem webfont — a tipografia é a stack
  Helvetica/Arial do sistema. O favicon é um data URI.
- **Páginas planas.** Tudo em `_site/` na raiz (`card-<slug>.html`,
  `doc-<slug>.html`), para que todo href seja um nome de arquivo simples.
- **O índice de busca é embutido** em `busca.html` dentro de uma tag `<script>`,
  porque `fetch` de JSON é bloqueado em `file://`. Passe qualquer JSON injetado
  em HTML por `jsonSeguro()` (`render/pages-extra.js`).
- **CSS e JS do site** moram em `src/render/styles.js` e `src/render/app-js.js`
  como template strings, e são escritos como `styles.css` / `app.js` no build.
  A paleta é definida por tokens CSS em `:root`, com temas claro e escuro
  resolvidos via `prefers-color-scheme` e `[data-theme]`.

## Armadilhas conhecidas

- **`serve` observa `docs/`, e a saída do build vive em `docs/_site/`.** O
  watcher precisa ignorar tudo sob a pasta de saída e ignorar eventos sem nome
  de arquivo, senão o build se realimenta e sobrescreve a saída de outro
  processo. Já corrigido em `src/serve.js`; não afrouxe esse filtro.
- **Caracteres Unicode exóticos em código-fonte.** Separadores de linha (os
  pontos de código U+2028 e U+2029) e afins devem ser escritos como sequência
  de escape ASCII, nunca como o caractere literal: a ferramenta de escrita os
  normaliza para espaço em silêncio, e o regex resultante passa a casar todo
  espaço do texto.
- **Escape antes de interpolar.** Todo texto vindo de documento passa por
  `escapeHtml()` antes de entrar no HTML. O renderer Markdown não aceita HTML
  cru de propósito.
- **`src/markdown.js` tem bytes NUL literais** (U+0000, em torno de `CODE0`),
  usados como sentinela ao tirar trechos de código de cena antes das
  substituições inline. A ferramenta de leitura mostra esses bytes como
  espaço. Nunca reescreva o arquivo inteiro a partir do que você leu: edite
  trechos. E nunca copie esse trecho literal para outro arquivo — foi assim
  que este próprio `CLAUDE.md` acabou ganhando um NUL de verdade uma vez.
- **Nada de `path.posix.resolve` em caminho de documento.** Eles usam barra
  normal mesmo no Windows, e um caminho que começa com `C:` não é absoluto para
  o posix — a função prefixaria o diretório de trabalho. `juntarCaminho()` em
  `graph.js` faz a normalização à mão, que é o que se quer aqui.
- **O build precisa ser determinístico.** Rodar o build duas vezes sem mexer em
  documento tem que produzir bytes idênticos, senão cada merge vira um diff de
  dezenas de arquivos que só mudaram de horário. É por isso que `carimbo()` em
  `build.js` deriva a frase de data do `updated` mais recente nos documentos, e
  não do relógio — o relógio só volta em `serve`, via `{ relogio: true }`. Ao
  adicionar qualquer coisa nova ao HTML gerado (contador, id aleatório, hora do
  build), pare e pergunte se aquilo pode variar entre duas rodadas do mesmo
  conteúdo. Se puder, quebra o `--verificar` e o teste "dois builds seguidos
  produzem arquivos idênticos" em `test/seguranca.test.js`.
- **Nunca escreva `npx doczilla` em texto gerado ou impresso.** Não existe
  pacote publicado — a ferramenta se instala copiando o código para dentro do
  projeto (`SEGURANCA.md`). Toda mensagem que sugere um comando (CLI e páginas
  geradas) usa `invocacao`, calculada em `invocacaoAtual()` (`cli.js`) a partir
  de `process.argv[1]` e propagada por `build()`/`serve()` até `projeto.invocacao`.
  O teste `'nenhuma pagina gerada sugere "npx doczilla"'` em
  `test/seguranca.test.js` existe para pegar quem esquecer disso.

## A `docs/` de demonstração

Contém defeitos **propositais**, que fazem a tela de saúde ter o que mostrar:

- `specs/ORI-1487-aprovacao-desconto.md` aponta para `[[politica-margem-minima]]`,
  que não existe → aviso crítico de ligação.
- `bugs/duplicidade-case-anexo.md` não declara `card` → aviso de frontmatter.
- `ORI-1502` e `ORI-1531` não têm spec → avisos de cobertura.

Um build limpo dessa pasta significa que alguém apagou o defeito por engano.

Há também `test/fixtures/legado/` — a "Plataforma Vela", um projeto **fictício**
que nunca ouviu falar do Doczilla: `.md` em três raízes, quase nenhum
frontmatter, dois `README.md` disputando o nome e ligações só por link
relativo. É o fixture do regime descoberto, e o esperado é
`0 críticos · 0 avisos · 3 observações` com os 6 documentos preservados.

Todo o conteúdo é **fictício**. Ao criar ou editar documentos de demonstração,
invente os dados: nunca use nome de cliente real, credencial, endpoint de
produção ou informação copiada de qualquer fonte externa.
