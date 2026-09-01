import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarDocumento } from '../src/load.js';
import { montarGrafo, regrasDoCard } from '../src/graph.js';
import { validar } from '../src/validate.js';

/** Monta um documento a partir de frontmatter e corpo, como se viesse do disco. */
function doc(relPath, frontmatter, corpo = 'Corpo do documento.') {
  const campos = Object.entries(frontmatter)
    .map(([k, v]) => (Array.isArray(v) ? `${k}: [${v.join(', ')}]` : `${k}: ${v}`))
    .join('\n');
  return montarDocumento(relPath, `---\n${campos}\n---\n\n${corpo}`);
}

function projetoExemplo() {
  return [
    doc('cards/ABC-1-entendimento.md', {
      type: 'entendimento', title: 'Entendimento do ABC-1', card: 'ABC-1', status: 'concluido', updated: '2026-01-02',
    }),
    doc('specs/ABC-1-spec.md', {
      type: 'spec', title: 'Spec do ABC-1', card: 'ABC-1', status: 'aprovada', updated: '2026-01-05',
    }, 'Segue a regra [[regra-alcada]].'),
    doc('entregas/ABC-1-entrega.md', {
      type: 'entrega', title: 'Entrega do ABC-1', card: 'ABC-1', status: 'em producao', components: ['Objeto__c'], deployed: '2026-01-09', updated: '2026-01-09',
    }, 'Implementa [[ABC-1-spec]].'),
    doc('regras/regra-alcada.md', {
      type: 'regra', title: 'Regra de alcada', status: 'vigente', updated: '2026-01-01',
    }),
  ];
}

test('agrupa documentos por card na ordem do padrao', () => {
  const grafo = montarGrafo(projetoExemplo());
  assert.equal(grafo.cards.length, 1);
  const [card] = grafo.cards;
  assert.deepEqual(card.docs.map((d) => d.type), ['entendimento', 'spec', 'entrega']);
});

test('titulo do card vem do entendimento', () => {
  const grafo = montarGrafo(projetoExemplo());
  assert.equal(grafo.cards[0].title, 'Entendimento do ABC-1');
});

test('status do card e o do documento mais avancado na trilha', () => {
  const grafo = montarGrafo(projetoExemplo());
  assert.equal(grafo.cards[0].status, 'em producao');
});

test('wikilink gera saida na origem e backlink no destino', () => {
  const grafo = montarGrafo(projetoExemplo());
  const spec = grafo.doc('ABC-1-spec');
  const regra = grafo.doc('regra-alcada');
  const entrega = grafo.doc('ABC-1-entrega');

  assert.ok(spec.saidas.includes('regra-alcada'));
  assert.ok(regra.entradas.includes('ABC-1-spec'));
  assert.ok(spec.entradas.includes('ABC-1-entrega'));
  assert.ok(entrega.saidas.includes('ABC-1-spec'));
});

test('regra chega ao card atraves dos wikilinks dos documentos', () => {
  const grafo = montarGrafo(projetoExemplo());
  const regras = regrasDoCard(grafo.cards[0], grafo);
  assert.deepEqual(regras.map((r) => r.id), ['regra-alcada']);
});

test('wikilink resolve ignorando caixa e acento', () => {
  const docs = [
    doc('regras/alcada-comercial.md', { type: 'regra', title: 'Alçada comercial', status: 'vigente', updated: '2026-01-01' }),
    doc('specs/x.md', { type: 'spec', title: 'X', card: 'ABC-2', status: 'aprovada', updated: '2026-01-02' },
      'Veja [[Alçada Comercial]].'),
  ];
  const grafo = montarGrafo(docs);
  assert.deepEqual(grafo.doc('x').quebrados, []);
  assert.ok(grafo.doc('x').saidas.includes('alcada-comercial'));
});

test('tipos faltando sao calculados por card', () => {
  const grafo = montarGrafo(projetoExemplo());
  assert.deepEqual(grafo.cards[0].tiposFaltando, ['arquitetura', 'bug']);
});

test('documento nao aponta para si mesmo', () => {
  const docs = [doc('specs/eu.md', {
    type: 'spec', title: 'Eu', card: 'ABC-3', status: 'aprovada', updated: '2026-01-01',
  }, 'Veja [[eu]].')];
  const grafo = montarGrafo(docs);
  assert.deepEqual(grafo.doc('eu').saidas, []);
  assert.deepEqual(grafo.doc('eu').entradas, []);
});

test('id duplicado e reportado e o segundo arquivo e ignorado', () => {
  const docs = [
    doc('specs/igual.md', { type: 'spec', title: 'Primeiro', card: 'A', status: 'aprovada', updated: '2026-01-01' }),
    doc('regras/igual.md', { type: 'regra', title: 'Segundo', status: 'vigente', updated: '2026-01-01' }),
  ];
  const grafo = montarGrafo(docs);
  assert.equal(grafo.duplicados.length, 1);
  assert.equal(grafo.doc('igual').title, 'Primeiro');
});

/* ---------------- validacao ---------------- */

test('acusa campo obrigatorio ausente do tipo', () => {
  const grafo = montarGrafo([doc('entregas/sem-deploy.md', {
    type: 'entrega', title: 'Entrega', card: 'ABC-9', status: 'em producao', updated: '2026-01-01',
  })]);
  const avisos = validar(grafo);
  const campos = avisos.filter((a) => a.categoria === 'frontmatter').map((a) => a.mensagem);
  assert.ok(campos.some((m) => m.includes('components')));
  assert.ok(campos.some((m) => m.includes('deployed')));
});

test('acusa wikilink quebrado como critico', () => {
  const grafo = montarGrafo([doc('specs/s.md', {
    type: 'spec', title: 'S', card: 'ABC-9', status: 'aprovada', updated: '2026-01-01',
  }, 'Veja [[nao-existe]].')]);
  const avisos = validar(grafo);
  const quebrado = avisos.find((a) => a.categoria === 'ligacao');
  assert.equal(quebrado.nivel, 'crit');
  assert.match(quebrado.mensagem, /nao-existe/);
});

test('acusa regra que declara card', () => {
  const grafo = montarGrafo([doc('regras/r.md', {
    type: 'regra', title: 'R', card: 'ABC-9', status: 'vigente', updated: '2026-01-01',
  })]);
  const avisos = validar(grafo);
  assert.ok(avisos.some((a) => a.mensagem.includes('Regra de negócio com campo')));
});

test('acusa card sem spec', () => {
  const grafo = montarGrafo([doc('cards/ABC-9-entendimento.md', {
    type: 'entendimento', title: 'E', card: 'ABC-9', status: 'concluido', updated: '2026-01-01',
  })]);
  const avisos = validar(grafo);
  assert.ok(avisos.some((a) => a.categoria === 'cobertura' && a.mensagem.includes('sem spec')));
});

test('acusa tipo fora do padrao', () => {
  const grafo = montarGrafo([doc('specs/x.md', {
    type: 'inventado', title: 'X', status: 'rascunho', updated: '2026-01-01',
  })]);
  const avisos = validar(grafo);
  assert.ok(avisos.some((a) => a.nivel === 'crit' && a.mensagem.includes('não existe no padrão')));
});

test('projeto correto nao gera nenhum aviso', () => {
  const docs = [
    doc('cards/ABC-1-entendimento.md', { type: 'entendimento', title: 'E', card: 'ABC-1', status: 'concluido', updated: '2026-01-01' }),
    doc('specs/ABC-1-spec.md', { type: 'spec', title: 'S', card: 'ABC-1', status: 'aprovada', updated: '2026-01-02' }),
  ];
  assert.deepEqual(validar(montarGrafo(docs)), []);
});
