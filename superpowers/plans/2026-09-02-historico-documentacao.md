# Histórico de documentação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda página da wiki gerada passa a mostrar quem fez a última alteração em `docs/` no rodapé, e uma nova página `historico.html` lista, em ordem cronológica, cada documento criado ou editado — tudo derivado do `git log`, sem exigir campo novo no frontmatter.

**Architecture:** Módulo novo `src/historico.js` shella para `git log --name-status` uma vez por build, parseia a saída em funções puras testáveis sem git real, e casa o resultado com `grafo.docs` por `doc.absPath` (mesma identidade que `graph.js` já usa para link relativo). `build.js` recebe esse resultado via um parâmetro injetável (mesmo padrão de `carimboTexto`), o que mantém os testes herméticos. `src/render/pages-historico.js` é a página nova; `layout.js` ganha a entrada de nav e a linha de autoria no rodapé.

**Tech Stack:** Node 18+ ESM, `node:child_process` (`execFile`, via `node:util.promisify`) para chamar `git`, `node:test` + `node:assert/strict` para os testes (mesmo runner do `npm test`).

## Global Constraints

- Zero dependências de runtime novas — nada em `package.json`. `child_process` é módulo nativo do Node, não é dependência.
- O build nunca pode lançar por falta de git: qualquer falha do comando degrada para `{ disponivel: false }`, silenciosamente.
- Todo texto vindo de fora do processo (nome de autor do git é texto livre, controlado por `git config user.name` de quem commitou) passa por `escapeHtml()` antes de entrar no HTML — mesma regra que já vale para conteúdo de documento.
- Caminhos usam sempre barra normal (`/`), nunca `path.posix.resolve` num caminho absoluto do Windows — normalizar com `.split(path.sep).join('/')`, igual ao resto do código (`load.js`, `graph.js`).
- Dois builds seguidos sem novo commit em `docs/` devem produzir bytes idênticos — `git log` sobre o mesmo `HEAD` sempre devolve a mesma saída, então essa garantia se mantém.
- Dado que `.git` não muda entre chamada e chamada de teste, testes que comparam HTML **nunca** chamam git de verdade: usam um `obterHistorico` fake injetado em `build()`.

---

### Task 1: `src/historico.js` — coleta e parse do histórico git

**Files:**
- Create: `src/historico.js`
- Test: `test/historico.test.js`

**Interfaces:**
- Consumes: nada de outro módulo do projeto (isolado do pipeline `load/graph/validate/render`, como o spec exige).
- Produces:
  - `parseLogGit(saida: string, toplevel: string): { ultimaAlteracao: {autor, data} | null, entradas: Array<{autor, data, acao: 'criou'|'editou', absPath}> }`
  - `casarComGrafo(historicoGit, grafo): { disponivel: boolean, ultimaAlteracao: {autor, data} | null, entradas: Array<{autor, data, acao, href, title, relPath}> }`
  - `obterHistoricoGit({ raiz, raizes }): Promise<{ disponivel, ultimaAlteracao, entradas }>` — usado por `build.js` como valor default do parâmetro `obterHistorico`.

- [ ] **Step 1: Escrever os testes de `parseLogGit` (falhando)**

Criar `test/historico.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLogGit, casarComGrafo } from '../src/historico.js';

test('parseLogGit devolve historico vazio quando nao ha commits', () => {
  const resultado = parseLogGit('', 'C:/repo');
  assert.deepEqual(resultado, { ultimaAlteracao: null, entradas: [] });
});

test('parseLogGit distingue criou (A) de editou (demais status) e ignora exclusoes (D)', () => {
  const saida = [
    '@@sha1|Maria Silva|2026-09-02',
    '',
    'M\tdocs/specs/spec-ori-1487.md',
    '@@sha2|Joao Souza|2026-08-30',
    '',
    'A\tdocs/bugs/bug-duplicidade-anexo.md',
    'D\tdocs/bugs/antigo.md',
  ].join('\n');

  const resultado = parseLogGit(saida, 'C:/repo');

  assert.deepEqual(resultado.ultimaAlteracao, { autor: 'Maria Silva', data: '2026-09-02' });
  assert.deepEqual(resultado.entradas, [
    { autor: 'Maria Silva', data: '2026-09-02', acao: 'editou', absPath: 'C:/repo/docs/specs/spec-ori-1487.md' },
    { autor: 'Joao Souza', data: '2026-08-30', acao: 'criou', absPath: 'C:/repo/docs/bugs/bug-duplicidade-anexo.md' },
  ]);
});

test('parseLogGit usa o caminho novo em renomeacoes', () => {
  const saida = [
    '@@sha1|Ana|2026-09-01',
    '',
    'R100\tdocs/specs/antigo-nome.md\tdocs/specs/novo-nome.md',
  ].join('\n');

  const resultado = parseLogGit(saida, 'C:/repo');

  assert.deepEqual(resultado.entradas, [
    { autor: 'Ana', data: '2026-09-01', acao: 'editou', absPath: 'C:/repo/docs/specs/novo-nome.md' },
  ]);
});

test('casarComGrafo linka entradas a docs existentes e descarta o resto', () => {
  const grafo = {
    docs: [
      { absPath: 'C:/repo/docs/regras/exemplo.md', href: 'doc-exemplo.html', title: 'Exemplo', relPath: 'regras/exemplo.md' },
    ],
  };
  const historicoGit = {
    disponivel: true,
    ultimaAlteracao: { autor: 'Maria', data: '2026-09-02' },
    entradas: [
      { autor: 'Maria', data: '2026-09-02', acao: 'editou', absPath: 'C:/repo/docs/regras/exemplo.md' },
      { autor: 'Zeca', data: '2026-08-01', acao: 'criou', absPath: 'C:/repo/docs/removido.md' },
    ],
  };

  const resultado = casarComGrafo(historicoGit, grafo);

  assert.equal(resultado.disponivel, true);
  assert.deepEqual(resultado.ultimaAlteracao, { autor: 'Maria', data: '2026-09-02' });
  assert.deepEqual(resultado.entradas, [
    { autor: 'Maria', data: '2026-09-02', acao: 'editou', href: 'doc-exemplo.html', title: 'Exemplo', relPath: 'regras/exemplo.md' },
  ]);
});

test('casarComGrafo propaga indisponibilidade sem tocar no grafo', () => {
  const resultado = casarComGrafo({ disponivel: false, ultimaAlteracao: null, entradas: [] }, { docs: [] });
  assert.deepEqual(resultado, { disponivel: false, ultimaAlteracao: null, entradas: [] });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `node --test test/historico.test.js`
Expected: FAIL — `Cannot find module '../src/historico.js'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `src/historico.js`**

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Parseia a saida de
 * `git log --name-status --date=short --pretty=format:@@%H|%an|%ad -- <caminhos>`.
 * Funcao pura: nao chama git, so interpreta texto. E o que torna o modulo
 * testavel sem repositorio git de verdade.
 */
export function parseLogGit(saida, toplevel) {
  const commits = [];
  let atual = null;

  for (const linhaBruta of saida.split('\n')) {
    const linha = linhaBruta.trimEnd();
    if (linha.startsWith('@@')) {
      const [sha, autor, data] = linha.slice(2).split('|');
      atual = { sha, autor, data, arquivos: [] };
      commits.push(atual);
      continue;
    }
    if (!linha || !atual) continue;

    const partes = linha.split('\t');
    if (partes.length < 2) continue;
    // Rename vem como "R100\tantigo\tnovo": o ultimo campo e sempre o
    // caminho atual, tanto em rename (3 campos) quanto no resto (2 campos).
    const status = partes[0][0];
    const caminhoAtual = partes[partes.length - 1];
    if (status === 'D') continue;

    atual.arquivos.push({
      acao: status === 'A' ? 'criou' : 'editou',
      absPath: `${toplevel}/${caminhoAtual}`,
    });
  }

  const ultimaAlteracao = commits.length
    ? { autor: commits[0].autor, data: commits[0].data }
    : null;

  const entradas = commits.flatMap((c) => c.arquivos.map((a) => ({
    autor: c.autor,
    data: c.data,
    acao: a.acao,
    absPath: a.absPath,
  })));

  return { ultimaAlteracao, entradas };
}

/**
 * Casa o historico bruto (por caminho absoluto) com os documentos do grafo
 * atual. Entrada sem doc correspondente (apagado, movido para fora das
 * raizes lidas) e descartada: nao ha para onde linkar.
 */
export function casarComGrafo(historicoGit, grafo) {
  if (!historicoGit.disponivel) {
    return { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }

  const porAbsPath = new Map(grafo.docs.map((doc) => [doc.absPath, doc]));
  const entradas = historicoGit.entradas
    .map((entrada) => {
      const doc = porAbsPath.get(entrada.absPath);
      if (!doc) return null;
      return {
        autor: entrada.autor,
        data: entrada.data,
        acao: entrada.acao,
        href: doc.href,
        title: doc.title,
        relPath: doc.relPath,
      };
    })
    .filter(Boolean);

  return { disponivel: true, ultimaAlteracao: historicoGit.ultimaAlteracao, entradas };
}

/**
 * Fonte real: pergunta ao git o que aconteceu nos caminhos de docs/. Nunca
 * lanca — qualquer falha (git ausente, pasta fora de um repo, comando sem
 * permissao) vira `disponivel: false`, e o resto da wiki segue normalmente.
 */
export async function obterHistoricoGit({ raiz, raizes }) {
  try {
    const { stdout: topBruto } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd: raiz },
    );
    const toplevel = topBruto.trim();

    const caminhos = raizes.map((r) => r.abs);
    const { stdout: saida } = await execFileAsync(
      'git',
      ['log', '--name-status', '--date=short', '--pretty=format:@@%H|%an|%ad', '--', ...caminhos],
      { cwd: raiz },
    );

    const { ultimaAlteracao, entradas } = parseLogGit(saida, toplevel);
    return { disponivel: true, ultimaAlteracao, entradas };
  } catch {
    return { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `node --test test/historico.test.js`
Expected: PASS — 5 testes.

- [ ] **Step 5: Testes de integração leve para `obterHistoricoGit` (opcional mas recomendado)**

Acrescentar ao final de `test/historico.test.js`:

```js
import { obterHistoricoGit } from '../src/historico.js';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('obterHistoricoGit funciona neste repositorio de verdade', async () => {
  const resultado = await obterHistoricoGit({
    raiz: process.cwd(),
    raizes: [{ abs: path.resolve('src') }],
  });
  assert.equal(resultado.disponivel, true);
  assert.ok(Array.isArray(resultado.entradas));
});

test('obterHistoricoGit degrada quando a pasta nao e um repositorio git', async () => {
  const pastaTemp = await mkdtemp(path.join(os.tmpdir(), 'doczilla-historico-'));
  try {
    const resultado = await obterHistoricoGit({ raiz: pastaTemp, raizes: [{ abs: pastaTemp }] });
    assert.deepEqual(resultado, { disponivel: false, ultimaAlteracao: null, entradas: [] });
  } finally {
    await rm(pastaTemp, { recursive: true, force: true });
  }
});
```

Run: `node --test test/historico.test.js`
Expected: PASS — 7 testes no total.

- [ ] **Step 6: Commit**

```bash
git add src/historico.js test/historico.test.js
git commit -m "feat: coleta e parse do historico git de docs/"
```

---

### Task 2: Camada de renderização — `pages-historico.js` e rodapé com autoria

**Files:**
- Create: `src/render/pages-historico.js`
- Modify: `src/render/layout.js`
- Test: `test/render-historico.test.js`

**Interfaces:**
- Consumes: `pagina`, `secao`, `escapeHtml` de `layout.js`/`markdown.js` (já existentes); `projeto.historico` no formato produzido por `casarComGrafo` (Task 1) — `{ disponivel, ultimaAlteracao: {autor, data}|null, entradas: [{autor, data, acao, href, title, relPath}] }`.
- Produces: `renderHistorico({ grafo, projeto }): string` (HTML), `dataCurta(iso: string): string` exportada de `layout.js`, entrada `historico.html` em `PAGINAS`.

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `test/render-historico.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataCurta, pagina } from '../src/render/layout.js';
import { renderHistorico } from '../src/render/pages-historico.js';

test('dataCurta converte AAAA-MM-DD em DD/MM', () => {
  assert.equal(dataCurta('2026-09-02'), '02/09');
});

test('dataCurta devolve o valor original quando o formato nao bate', () => {
  assert.equal(dataCurta(''), '');
  assert.equal(dataCurta('build de hoje'), 'build de hoje');
});

function projetoBase(historico) {
  return {
    nome: 'Projeto Fixture', totalDocs: 1, raizes: [{ rel: 'docs' }],
    dirDocs: 'docs', build: 'documentação de 02/09/2026', historico,
  };
}

test('renderHistorico lista entradas com autor, acao e link para o documento', () => {
  const historico = {
    disponivel: true,
    entradas: [
      { autor: 'Maria Silva', data: '2026-09-02', acao: 'editou', href: 'doc-exemplo.html', title: 'Exemplo', relPath: 'regras/exemplo.md' },
      { autor: 'Joao Souza', data: '2026-08-30', acao: 'criou', href: 'doc-exemplo.html', title: 'Exemplo', relPath: 'regras/exemplo.md' },
    ],
  };
  const html = renderHistorico({ grafo: { docs: [] }, projeto: projetoBase(historico) });

  assert.match(html, /Maria Silva/);
  assert.match(html, /editou/);
  assert.match(html, /Joao Souza/);
  assert.match(html, /criou/);
  assert.match(html, /href="doc-exemplo\.html"/);
});

test('renderHistorico escapa nome de autor com HTML', () => {
  const historico = {
    disponivel: true,
    entradas: [
      { autor: '<script>x</script>', data: '2026-09-02', acao: 'editou', href: 'doc-exemplo.html', title: 'Exemplo', relPath: 'regras/exemplo.md' },
    ],
  };
  const html = renderHistorico({ grafo: { docs: [] }, projeto: projetoBase(historico) });

  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('renderHistorico mostra estado vazio quando git nao esta disponivel', () => {
  const html = renderHistorico({ grafo: { docs: [] }, projeto: projetoBase({ disponivel: false, entradas: [] }) });
  assert.match(html, /Histórico indisponível/);
});

test('rodape mostra autoria quando o historico esta disponivel', () => {
  const projeto = projetoBase({
    disponivel: true,
    ultimaAlteracao: { autor: 'Maria Silva', data: '2026-09-02' },
    entradas: [],
  });
  const html = pagina({ titulo: 'Início', chave: 'inicio', projeto, conteudo: '' });
  assert.match(html, /última atualização por Maria Silva em 02\/09/);
});

test('rodape volta ao carimbo quando o historico nao esta disponivel', () => {
  const projeto = projetoBase({ disponivel: false, ultimaAlteracao: null, entradas: [] });
  const html = pagina({ titulo: 'Início', chave: 'inicio', projeto, conteudo: '' });
  assert.match(html, /documentação de 02\/09\/2026/);
  assert.doesNotMatch(html, /última atualização por/);
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `node --test test/render-historico.test.js`
Expected: FAIL — `dataCurta`/`renderHistorico` não existem ainda, e o rodapé atual não produz "última atualização por".

- [ ] **Step 3: Criar `src/render/pages-historico.js`**

```js
import { escapeHtml } from '../markdown.js';
import { pagina, secao, dataCurta } from './layout.js';

const LIMITE_ENTRADAS = 40;

/**
 * Lista cronologica (mais recente primeiro) de documentos criados ou
 * editados, derivada do historico de commits de docs/. Sempre presente no
 * menu, mesmo quando o git nao esta disponivel: nesse caso mostra um estado
 * vazio explicando o motivo, em vez de sumir da navegacao.
 */
export function renderHistorico({ grafo, projeto }) {
  const historico = projeto.historico ?? { disponivel: false, entradas: [] };

  const corpo = historico.disponivel
    ? listaHistorico(historico.entradas)
    : '<div class="vazio">Histórico indisponível: esta pasta não está dentro de um repositório git, ou o git não foi encontrado. O resto da wiki funciona normalmente — só a autoria não aparece.</div>';

  const conteudo = secao({
    bare: true,
    label: 'Histórico',
    lead: '<b>Quem mexeu na documentação, e quando.</b> Cada linha vem do histórico de commits de <code>docs/</code> — nenhum campo novo para preencher, nenhum passo a mais para quem escreve.',
    corpo,
  });

  return pagina({ titulo: 'Histórico', chave: 'historico', projeto, conteudo, livereload: projeto.livereload });
}

function listaHistorico(entradas) {
  if (!entradas.length) {
    return '<div class="vazio">Nenhum commit encontrado para os documentos lidos.</div>';
  }

  const linhas = entradas.slice(0, LIMITE_ENTRADAS).map((entrada) => `<div class="hrow">
  <span class="st plain">${escapeHtml(dataCurta(entrada.data))}</span>
  <span class="msg"><b>${escapeHtml(entrada.autor)}</b> ${entrada.acao} <a href="${entrada.href}">${escapeHtml(entrada.title)}</a></span>
  <code>${escapeHtml(entrada.relPath)}</code>
</div>`).join('');

  const resto = entradas.length > LIMITE_ENTRADAS
    ? `<div class="hrow"><span class="st plain">e mais</span><span class="msg">${entradas.length - LIMITE_ENTRADAS} entradas não listadas aqui.</span><code></code></div>`
    : '';

  return `<div class="hlist">${linhas}${resto}</div>`;
}
```

- [ ] **Step 4: Editar `src/render/layout.js`**

Adicionar `historico.html` a `PAGINAS` (`src/render/layout.js:4-11`), como último item antes do Mapa condicional:

```js
export const PAGINAS = [
  { href: 'index.html', rotulo: 'Início', chave: 'inicio' },
  { href: 'cards.html', rotulo: 'Cards', chave: 'cards' },
  { href: 'documentos.html', rotulo: 'Documentos', chave: 'documentos' },
  { href: 'busca.html', rotulo: 'Busca', chave: 'busca' },
  { href: 'grafo.html', rotulo: 'Grafo', chave: 'grafo' },
  { href: 'padrao.html', rotulo: 'Padrão', chave: 'padrao' },
  { href: 'historico.html', rotulo: 'Histórico', chave: 'historico' },
];
```

Adicionar `dataCurta`, exportada, logo após `listaDeRaizes` (`src/render/layout.js:81`):

```js
/** "2026-09-02" (formato --date=short do git) vira "02/09" para leitura rapida. */
export function dataCurta(iso) {
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
}
```

Trocar `rodape()` (`src/render/layout.js:67-72`) por:

```js
function rodape(projeto) {
  const ultima = projeto.historico?.disponivel ? projeto.historico.ultimaAlteracao : null;
  const linhaData = ultima
    ? ` · última atualização por ${escapeHtml(ultima.autor)} em ${dataCurta(ultima.data)}`
    : (projeto.build ? ` · ${escapeHtml(projeto.build)}` : '');
  return `<footer class="footnote">
  <span>${escapeHtml(projeto.nome)} · ${projeto.totalDocs} documentos${linhaData}</span>
  <span>Gerado pelo Doczilla a partir de ${listaDeRaizes(projeto)}</span>
</footer>`;
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `node --test test/render-historico.test.js`
Expected: PASS — 7 testes.

- [ ] **Step 6: Commit**

```bash
git add src/render/pages-historico.js src/render/layout.js test/render-historico.test.js
git commit -m "feat: pagina Historico e autoria no rodape da wiki"
```

---

### Task 3: Ligar tudo em `build.js`

**Files:**
- Modify: `src/build.js`
- Create: `test/fixtures/historico/doczilla.config.json`
- Create: `test/fixtures/historico/docs/regras/exemplo.md`
- Test: `test/build.test.js`

**Interfaces:**
- Consumes: `obterHistoricoGit`, `casarComGrafo` de `src/historico.js` (Task 1); `renderHistorico` de `src/render/pages-historico.js` (Task 2).
- Produces: `build()` aceita `obterHistorico` (default `obterHistoricoGit`); `projeto.historico` fica disponível para toda a camada de render; `arquivos`/`paginasHtml` retornados por `build()` passam a incluir `historico.html`.

- [ ] **Step 1: Criar a fixture mínima**

`test/fixtures/historico/doczilla.config.json`:

```json
{
  "nome": "Fixture Histórico"
}
```

`test/fixtures/historico/docs/regras/exemplo.md`:

```markdown
---
type: regra
title: Exemplo de regra
status: vigente
updated: 2026-09-01
---

Uma regra de exemplo, só para o teste do histórico ter um documento para linkar.
```

- [ ] **Step 2: Escrever o teste de integração (falhando)**

Criar `test/build.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from '../src/build.js';

const raizFixture = path.resolve('test/fixtures/historico');
const absPathDoExemplo = path.join(raizFixture, 'docs', 'regras', 'exemplo.md').split(path.sep).join('/');

function obterHistoricoFake() {
  return {
    disponivel: true,
    ultimaAlteracao: { autor: 'Maria Silva', data: '2026-09-02' },
    entradas: [
      { autor: 'Maria Silva', data: '2026-09-02', acao: 'editou', absPath: absPathDoExemplo },
      { autor: 'Joao Souza', data: '2026-08-30', acao: 'criou', absPath: absPathDoExemplo },
    ],
  };
}

test('build inclui historico.html e autoria no rodape quando o git esta disponivel', async () => {
  const resultado = await build({
    raiz: raizFixture,
    escrever: false,
    obterHistorico: obterHistoricoFake,
  });

  const historico = resultado.paginasHtml.get('historico.html');
  assert.ok(historico, 'historico.html deveria estar entre as paginas geradas');
  assert.match(historico, /Maria Silva/);
  assert.match(historico, /Joao Souza/);

  const index = resultado.paginasHtml.get('index.html');
  assert.match(index, /última atualização por Maria Silva em 02\/09/);
});

test('build degrada em silencio quando obterHistorico falha', async () => {
  const resultado = await build({
    raiz: raizFixture,
    escrever: false,
    obterHistorico: async () => { throw new Error('git indisponivel'); },
  });

  // build() nao deve propagar o erro: precisa ter chamado com fallback ou
  // capturado a excecao antes de chegar aqui.
  const historico = resultado.paginasHtml.get('historico.html');
  assert.match(historico, /Histórico indisponível/);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `node --test test/build.test.js`
Expected: FAIL — `build()` ainda não aceita `obterHistorico`, e `historico.html` não existe em `paginasHtml`.

- [ ] **Step 4: Editar `src/build.js`**

Imports (depois da linha `import { validar, resumoAvisos, docsValidos, progressoAdocao } from './validate.js';`, `src/build.js:6`):

```js
import { obterHistoricoGit, casarComGrafo } from './historico.js';
```

E depois de `import { renderBusca, renderGrafo, renderPadrao, renderMapa } from './render/pages-extra.js';` (`src/build.js:11`):

```js
import { renderHistorico } from './render/pages-historico.js';
```

Assinatura de `build()` (`src/build.js:18-21`):

```js
export async function build({
  raiz = process.cwd(), livereload = false, carimboTexto = '', escrever = true,
  invocacao = 'node bin/doczilla.js', obterHistorico = obterHistoricoGit,
} = {}) {
```

Logo depois de `const grafo = montarGrafo(...)` (`src/build.js:31-35`), antes de `const avisos = validar(...)`, inserir — envolto em try/catch porque um `obterHistorico` injetado (como no teste do Step 2 acima) pode lançar, e isso não pode derrubar o build:

```js
  let historico;
  try {
    const historicoGit = await obterHistorico({ raiz, raizes: config.raizes });
    historico = casarComGrafo(historicoGit, grafo);
  } catch {
    historico = { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }
```

No objeto `projeto` (`src/build.js:40-55`), acrescentar `historico,` logo após `livereload,`:

```js
    livereload,
    historico,
    // Como este build foi de fato invocado, ...
    invocacao,
```

Registro de página, logo após `paginas.set('grafo.html', renderGrafo({ grafo, projeto }));` (`src/build.js:62`):

```js
  paginas.set('historico.html', renderHistorico({ grafo, projeto }));
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `node --test test/build.test.js`
Expected: PASS — 2 testes.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS — todos os testes de `test/*.test.js`, incluindo os das Tasks 1 e 2.

- [ ] **Step 7: Commit**

```bash
git add src/build.js test/build.test.js test/fixtures/historico
git commit -m "feat: liga o historico git ao build da wiki"
```

---

### Task 4: Regenerar a demonstração e verificar visualmente

**Files:**
- Modify: `docs/_site/*` (gerado, não editado à mão)

**Interfaces:**
- Consumes: `node bin/doczilla.js build` (CLI já existente).
- Produces: `docs/_site/` atualizado, incluindo `historico.html` novo, commitado — fecha o ciclo descrito em `FLUXO-DA-EQUIPE.md`.

- [ ] **Step 1: Confirmar que a saída atual está desatualizada**

Run: `node bin/doczilla.js build --verificar`
Expected: exit code 1 — `historico.html` listado como ausente, e possivelmente outras páginas com rodapé desatualizado.

- [ ] **Step 2: Gerar a saída nova**

Run: `node bin/doczilla.js build`
Expected: saída no terminal confirmando a escrita em `docs/_site/`, avisos propositais do Projeto Órion inalterados (o wikilink quebrado em `ORI-1487`, a falta de `card` em `duplicidade-case-anexo.md`, a falta de spec em `ORI-1502`/`ORI-1531` continuam aparecendo — este trabalho não mexe em `validate.js`).

- [ ] **Step 3: Verificar visualmente**

Abrir `docs/_site/historico.html` num navegador e conferir:
- A lista mostra commits reais deste repositório que tocaram `docs/`, mais recentes primeiro.
- Cada linha linka para a página do documento certo.
- O rodapé de `docs/_site/index.html` mostra "última atualização por `<nome real do último commit>` em `<data>`".

- [ ] **Step 4: Confirmar que a saída está em dia**

Run: `node bin/doczilla.js build --verificar`
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add docs/_site
git commit -m "chore: regenera docs/_site com a pagina Historico"
```
