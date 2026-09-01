import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarDocumento } from '../src/load.js';
import { montarGrafo } from '../src/graph.js';
import { validar, progressoAdocao } from '../src/validate.js';
import { build } from '../src/build.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGADO = path.join(RAIZ, 'test', 'fixtures', 'legado');

const DESCOBERTO = {
  regime: 'descoberto',
  ligacoes: { relativos: true, campos: [] },
  eixo: { modo: 'pasta', padrao: '', rotulo: 'Pasta', rotuloPlural: 'Pastas' },
};

/** Documento sem frontmatter, como quase todo arquivo de projeto existente. */
function solto(relPath, corpo) {
  return montarDocumento(relPath, corpo, { absPath: `/proj/${relPath}` });
}

test('link relativo gera saida na origem e backlink no destino', () => {
  const grafo = montarGrafo([
    solto('docs/guia.md', 'Veja a [decisão](../adr/0001-banco.md).'),
    solto('adr/0001-banco.md', 'Postgres.'),
  ], DESCOBERTO);

  assert.deepEqual(grafo.doc('guia').saidas, ['0001-banco']);
  assert.deepEqual(grafo.doc('0001-banco').entradas, ['guia']);
});

test('link relativo nao vira ligacao sem o perfil pedir', () => {
  const grafo = montarGrafo([
    solto('docs/guia.md', 'Veja a [decisão](../adr/0001-banco.md).'),
    solto('adr/0001-banco.md', 'Postgres.'),
  ], { regime: 'descoberto', eixo: DESCOBERTO.eixo });

  assert.deepEqual(grafo.doc('guia').saidas, []);
});

test('link relativo para fora das raizes e observacao, nao critico', () => {
  const grafo = montarGrafo([solto('docs/guia.md', 'Veja o [codigo](../src/LEIAME.md).')], DESCOBERTO);
  const avisos = validar(grafo, { regime: 'descoberto' });

  assert.deepEqual(grafo.doc('guia').relativosQuebrados, ['../src/LEIAME.md']);
  assert.equal(avisos.filter((a) => a.nivel === 'crit').length, 0);
  assert.ok(avisos.some((a) => a.categoria === 'ligacao' && a.nivel === 'info'));
});

test('homonimo e qualificado pela pasta, e nenhum documento se perde', () => {
  const grafo = montarGrafo([
    solto('README.md', 'raiz'),
    solto('docs/api/README.md', 'api'),
  ], DESCOBERTO);

  assert.equal(grafo.docs.length, 2);
  assert.equal(grafo.duplicados.length, 0);
  assert.deepEqual(grafo.qualificados.map((q) => q.para), ['api/README']);
  assert.equal(grafo.doc('api/README').relPath, 'docs/api/README.md');
  assert.equal(grafo.doc('README').relPath, 'README.md');
});

test('campo de frontmatter alheio liga documentos', () => {
  const docs = [
    montarDocumento('adr/0002.md', '---\ntitle: Dois\nparent: 0001\n---\ncorpo'),
    montarDocumento('adr/0001.md', '---\ntitle: Um\n---\ncorpo'),
  ];
  const grafo = montarGrafo(docs, { ...DESCOBERTO, ligacoes: { relativos: false, campos: ['parent'] } });

  assert.ok(grafo.doc('0002').saidas.includes('0001'));
  assert.ok(grafo.doc('0001').entradas.includes('0002'));
});

test('eixo por chave agrupa pelo ticket no nome do arquivo', () => {
  const grafo = montarGrafo([
    solto('specs/ORI-1487-aprovacao.md', 'a'),
    solto('bugs/ORI-1487-duplicidade.md', 'b'),
    solto('specs/ORI-1502-envio.md', 'c'),
  ], { ...DESCOBERTO, eixo: { modo: 'chave', padrao: '[A-Z]{2,6}-\\d+', rotulo: 'Card', rotuloPlural: 'Cards' } });

  assert.deepEqual(grafo.cards.map((c) => c.id), ['ORI-1502', 'ORI-1487']);
  assert.equal(grafo.cards.find((c) => c.id === 'ORI-1487').docs.length, 2);
});

test('eixo por pasta agrupa pela arvore de diretorios', () => {
  const grafo = montarGrafo([
    solto('docs/api/a.md', 'a'),
    solto('docs/api/b.md', 'b'),
    solto('docs/guia.md', 'c'),
  ], DESCOBERTO);

  assert.deepEqual(grafo.cards.map((c) => c.id).sort(), ['docs', 'docs/api']);
});

test('fora do eixo card, a trilha de tipos nao e cobrada', () => {
  const grafo = montarGrafo([
    montarDocumento('docs/x.md', '---\ntype: entendimento\ntitle: X\nstatus: ok\nupdated: 2026-01-01\n---\nc'),
  ], DESCOBERTO);
  const avisos = validar(grafo, { regime: 'descoberto' });

  assert.deepEqual(grafo.cards[0].tiposFaltando, []);
  assert.equal(avisos.filter((a) => a.categoria === 'cobertura').length, 0);
});

test('arquivo legado nao vira critico: vira uma observacao agregada', () => {
  const docs = ['a', 'b', 'c', 'd'].map((n) => solto(`docs/${n}.md`, 'sem frontmatter'));
  const avisos = validar(montarGrafo(docs, DESCOBERTO), { regime: 'descoberto' });
  const adocao = avisos.filter((a) => a.categoria === 'adocao');

  assert.equal(avisos.filter((a) => a.nivel === 'crit').length, 0);
  assert.equal(adocao.length, 1);
  assert.match(adocao[0].mensagem, /4 arquivos ainda não têm frontmatter/);
  assert.deepEqual(adocao[0].alvos.length, 4);
});

test('no regime padrao o arquivo sem frontmatter continua critico', () => {
  const avisos = validar(montarGrafo([solto('docs/a.md', 'sem frontmatter')]));
  assert.equal(avisos.filter((a) => a.nivel === 'crit').length, 1);
});

test('progresso de adocao conta quem ja tem tipo do padrao', () => {
  const grafo = montarGrafo([
    solto('docs/a.md', 'legado'),
    montarDocumento('docs/b.md', '---\ntype: spec\ntitle: B\n---\nc'),
  ], DESCOBERTO);

  assert.deepEqual(progressoAdocao(grafo), {
    total: 2, noPadrao: 1, fora: 1, percentual: 50,
  });
});

/* ---------------- ponta a ponta ---------------- */

test('build do projeto legado nao perde documento nem gera critico', async () => {
  const resultado = await build({ raiz: LEGADO });

  assert.equal(resultado.grafo.docs.length, 6);
  assert.equal(resultado.resumo.crit, 0);
  assert.equal(resultado.resumo.warn, 0);
  assert.equal(resultado.config.regime, 'descoberto');

  // A ligacao atravessa raizes diferentes: docs/ aponta para adr/.
  const guia = resultado.grafo.doc('guia');
  assert.ok(guia.saidas.includes('0001-escolha-do-banco'));

  // E a pagina do documento troca o link relativo pela pagina de destino.
  const paginaGuia = resultado.paginasHtml.get(guia.href);
  assert.match(paginaGuia, /href="doc-0001-escolha-do-banco\.html"/);
  assert.ok(resultado.paginasHtml.has('mapa.html'));
});
