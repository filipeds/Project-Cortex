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
