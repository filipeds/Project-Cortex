import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analisar, detectarEixo, detectarLigacoes, proporRaizes, tipoDaPasta,
} from '../src/analyze.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGADO = path.join(RAIZ, 'test', 'fixtures', 'legado');

/** Documento como a analise o enxerga, sem passar pelo disco. */
function doc(nome, extra = {}) {
  return {
    nome, title: nome, pasta: 'docs', temFrontmatter: true, campos: [],
    type: '', card: '', wikilinks: 0, relativos: 0, ruido: false, ...extra,
  };
}

test('eixo e o campo card quando os documentos ja o declaram', () => {
  const eixo = detectarEixo([
    doc('a', { card: 'ORI-1' }), doc('b', { card: 'ORI-1' }), doc('c'),
  ]);
  assert.equal(eixo.modo, 'card');
});

test('eixo e a chave do ticket quando ela se repete no nome', () => {
  const eixo = detectarEixo([
    doc('ORI-1487-spec'), doc('ORI-1487-entrega'), doc('ORI-1502-spec'), doc('glossario'),
  ]);
  assert.equal(eixo.modo, 'chave');
  assert.match('ORI-1487-spec', new RegExp(eixo.padrao));
  assert.equal(eixo.cobertura, 75);
});

test('eixo cai na pasta quando nenhuma marca se repete o bastante', () => {
  const eixo = detectarEixo([doc('guia'), doc('instalacao'), doc('faq'), doc('ADR-1')]);
  assert.equal(eixo.modo, 'pasta');
  // O palpite descartado fica guardado para o relatorio poder explicar a escolha.
  assert.ok(eixo.descartado.cobertura < 40);
});

test('nome de pasta conhecido sugere o tipo do padrao', () => {
  assert.equal(tipoDaPasta('especificacoes'), 'spec');
  assert.equal(tipoDaPasta('ADR'), 'arquitetura');
  assert.equal(tipoDaPasta('incidentes'), 'bug');
  assert.equal(tipoDaPasta('qualquer-coisa'), '');
});

test('campo de frontmatter alheio vira ligacao', () => {
  const { campos } = detectarLigacoes([doc('a', { campos: ['title', 'parent', 'epic'] })]);
  assert.deepEqual(campos.sort(), ['epic', 'parent']);
});

test('raiz do projeto entra com profundidade 1, para nao arrastar o repositorio', () => {
  const raizes = proporRaizes([
    { caminho: '.', total: 1, ruido: 0, tipoSugerido: '' },
    { caminho: 'docs', total: 4, ruido: 0, tipoSugerido: '' },
    { caminho: 'docs/api', total: 2, ruido: 0, tipoSugerido: '' },
  ]);
  const raiz = raizes.find((r) => r.caminho === '.');
  assert.equal(raiz.profundidade, 1);
  // A subpasta nao vira raiz propria: docs/ ja a alcanca.
  assert.deepEqual(raizes.map((r) => r.caminho), ['.', 'docs']);
});

test('pasta que so tem ruido de repositorio fica de fora das raizes', () => {
  const raizes = proporRaizes([
    { caminho: 'docs', total: 3, ruido: 0, tipoSugerido: '' },
    { caminho: 'legal', total: 2, ruido: 2, tipoSugerido: '' },
  ]);
  assert.deepEqual(raizes.map((r) => r.caminho), ['docs']);
});

test('analisa o projeto legado e propoe um perfil utilizavel', async () => {
  const analise = await analisar({ raiz: LEGADO });

  assert.equal(analise.total, 6);
  assert.ok(analise.pastas.some((p) => p.caminho === 'adr' && p.tipoSugerido === 'arquitetura'));
  // Nenhum card, nenhuma marca repetida: sobra a pasta.
  assert.equal(analise.perfil.eixo.modo, 'pasta');
  assert.equal(analise.perfil.ligacoes.relativos, true);
  assert.deepEqual(analise.perfil.ligacoes.campos, ['parent']);
  assert.deepEqual(
    analise.perfil.raizes.map((r) => r.caminho).sort(),
    ['.', 'adr', 'docs'],
  );
});
