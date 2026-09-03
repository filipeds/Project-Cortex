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
