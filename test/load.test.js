import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarDocumentos, montarDocumento } from '../src/load.js';
import { carregarConfig } from '../src/config.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGADO = path.join(RAIZ, 'test', 'fixtures', 'legado');

async function docsDoLegado() {
  const config = await carregarConfig(LEGADO);
  const docs = await carregarDocumentos(config.raizes, {
    ignorar: config.perfil.ignorar,
    dirSaida: config.dirSaida,
  });
  return { config, docs, por: (rel) => docs.find((d) => d.relPath === rel) };
}

test('le todas as raizes declaradas no perfil', async () => {
  const { docs } = await docsDoLegado();
  assert.deepEqual(
    docs.map((d) => d.relPath).sort(),
    [
      'README.md',
      'adr/0001-escolha-do-banco.md',
      'adr/0002-autenticacao.md',
      'docs/api/README.md',
      'docs/api/endpoints.md',
      'docs/guia.md',
    ],
  );
});

test('profundidade 1 na raiz do projeto pega so o que esta em cima', async () => {
  const { docs } = await docsDoLegado();
  const daRaiz = docs.filter((d) => d.raiz === '.');
  assert.deepEqual(daRaiz.map((d) => d.relPath), ['README.md']);
});

test('raiz empresta o tipo a quem nao declara, e marca como inferido', async () => {
  const { por } = await docsDoLegado();
  const adr = por('adr/0001-escolha-do-banco.md');
  assert.equal(adr.type, 'arquitetura');
  assert.equal(adr.typeInferido, true);
});

test('frontmatter proprio ganha do tipo da raiz', () => {
  const doc = montarDocumento('adr/x.md', '---\ntype: spec\ntitle: X\n---\ncorpo', { tipoPadrao: 'arquitetura' });
  assert.equal(doc.type, 'spec');
  assert.equal(doc.typeInferido, false);
});

test('com mais de uma raiz o relPath ganha o nome da raiz na frente', async () => {
  const { por } = await docsDoLegado();
  assert.ok(por('adr/0002-autenticacao.md'));
  assert.equal(por('adr/0002-autenticacao.md').raiz, 'adr');
});

test('links relativos do corpo sao coletados', () => {
  const doc = montarDocumento('docs/a.md', 'Veja [b](../adr/b.md), [c](https://x.com) e ![i](p.png).');
  assert.deepEqual(doc.relativos, ['../adr/b.md']);
});

test('segmentos e pastaCompleta descrevem onde o arquivo mora', () => {
  const doc = montarDocumento('docs/api/v2/endpoints.md', 'corpo');
  assert.deepEqual(doc.segmentos, ['docs', 'api', 'v2']);
  assert.equal(doc.pastaCompleta, 'docs/api/v2');
  assert.equal(doc.pasta, 'docs');
});
