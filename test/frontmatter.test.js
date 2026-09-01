import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, comoLista } from '../src/frontmatter.js';

test('le pares chave/valor e separa o corpo', () => {
  const { data, body, temFrontmatter } = parseFrontmatter(
    '---\ntype: spec\ntitle: Alçada de aprovação\n---\n\n## Contexto\n\nTexto.',
  );
  assert.equal(temFrontmatter, true);
  assert.equal(data.type, 'spec');
  assert.equal(data.title, 'Alçada de aprovação');
  assert.equal(body, '## Contexto\n\nTexto.');
});

test('le lista inline e lista em bloco', () => {
  const { data } = parseFrontmatter(
    '---\ntags: [opportunity, aprovacao]\nrelated:\n  - alcada-comercial\n  - ORI-1487-approval-process\n---\ncorpo',
  );
  assert.deepEqual(data.tags, ['opportunity', 'aprovacao']);
  assert.deepEqual(data.related, ['alcada-comercial', 'ORI-1487-approval-process']);
});

test('lista vazia quando a chave abre sem itens', () => {
  const { data } = parseFrontmatter('---\nrelated:\nstatus: rascunho\n---\ncorpo');
  assert.deepEqual(data.related, []);
  assert.equal(data.status, 'rascunho');
});

test('remove aspas e converte booleanos', () => {
  const { data } = parseFrontmatter('---\ntitle: "Com: dois pontos"\nativo: true\n---\n');
  assert.equal(data.title, 'Com: dois pontos');
  assert.equal(data.ativo, true);
});

test('nao confunde "#" de valor sem espaco com comentario', () => {
  const { data } = parseFrontmatter('---\ncor: #FF0000\nnota: valor # isto e comentario\n---\n');
  assert.equal(data.cor, '#FF0000');
  assert.equal(data.nota, 'valor');
});

test('frontmatter aberto e nao fechado nao engole o arquivo', () => {
  const { data, body, temFrontmatter } = parseFrontmatter('---\ntype: spec\n\n## Titulo');
  assert.equal(temFrontmatter, false);
  assert.deepEqual(data, {});
  assert.match(body, /## Titulo/);
});

test('arquivo sem frontmatter vira corpo inteiro', () => {
  const { temFrontmatter, body } = parseFrontmatter('# So markdown\n\nSem metadado.');
  assert.equal(temFrontmatter, false);
  assert.equal(body, '# So markdown\n\nSem metadado.');
});

test('aceita CRLF e BOM', () => {
  const { data, temFrontmatter } = parseFrontmatter('﻿---\r\ntype: bug\r\nseverity: alta\r\n---\r\ncorpo');
  assert.equal(temFrontmatter, true);
  assert.equal(data.type, 'bug');
  assert.equal(data.severity, 'alta');
});

test('comoLista normaliza string, lista e vazio', () => {
  assert.deepEqual(comoLista('um'), ['um']);
  assert.deepEqual(comoLista(['um', 'dois']), ['um', 'dois']);
  assert.deepEqual(comoLista(''), []);
  assert.deepEqual(comoLista(undefined), []);
});
