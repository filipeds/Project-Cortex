import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderMarkdown, extrairWikilinks, textoPuro, escapeHtml, slugify,
} from '../src/markdown.js';

const semResolver = { resolver: () => null };

test('escapa HTML cru vindo do markdown', () => {
  const { html } = renderMarkdown('Um <script>alert(1)</script> no texto.', semResolver);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('titulo ganha id unico mesmo repetido', () => {
  const { html, toc } = renderMarkdown('## Contexto\n\n## Contexto', semResolver);
  assert.deepEqual(toc.map((t) => t.id), ['contexto', 'contexto-2']);
  assert.ok(html.includes('id="contexto-2"'));
});

test('slugify remove acento e pontuacao', () => {
  assert.equal(slugify('Critérios de aceite'), 'criterios-de-aceite');
  assert.equal(slugify('  '), 'secao');
});

test('renderiza tabela com alinhamento', () => {
  const { html } = renderMarkdown('| A | B |\n|---|---:|\n| 1 | 2 |', semResolver);
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('style="text-align:right"'));
  assert.ok(html.includes('<td>1</td>'));
});

test('bloco de codigo preserva conteudo e marca a linguagem', () => {
  const { html } = renderMarkdown('```apex\nif (a < b) { return; }\n```', semResolver);
  assert.ok(html.includes('data-lang="apex"'));
  assert.ok(html.includes('if (a &lt; b)'));
});

test('nao interpreta markdown dentro de crase', () => {
  const { html } = renderMarkdown('Use `**isto**` literal.', semResolver);
  assert.ok(html.includes('<code>**isto**</code>'));
  assert.ok(!html.includes('<strong>isto</strong>'));
});

test('lista aninhada vira ul dentro de li', () => {
  const { html } = renderMarkdown('- um\n- dois\n  - filho', semResolver);
  // renderBlocos junta blocos com quebra de linha, entao comparamos sem espacos.
  const compacto = html.replace(/\s+</g, '<');
  assert.equal(compacto, '<ul><li>um</li><li>dois<ul><li>filho</li></ul></li></ul>');
});

test('lista ordenada e reconhecida separadamente', () => {
  const { html } = renderMarkdown('1. um\n2. dois', semResolver);
  assert.ok(html.includes('<ol><li>um</li><li>dois</li></ol>'));
});

test('wikilink resolvido vira link; nao resolvido vira marca de quebrado', () => {
  const resolver = (nome) => (nome === 'existe' ? { href: 'doc-existe.html', label: 'Existe', token: 't-spec' } : null);
  const { html } = renderMarkdown('Veja [[existe]] e [[fantasma]].', { resolver });
  assert.ok(html.includes('href="doc-existe.html"'));
  assert.ok(html.includes('Existe</a>'));
  assert.ok(html.includes('wl-quebrado'));
  assert.ok(html.includes('fantasma'));
});

test('wikilink aceita rotulo customizado', () => {
  const resolver = () => ({ href: 'x.html', label: 'Titulo Longo' });
  const { html } = renderMarkdown('[[alcada-comercial|a regra de alçada]]', { resolver });
  assert.ok(html.includes('>a regra de alçada</a>'));
});

test('extrairWikilinks ignora os que estao dentro de codigo', () => {
  const md = 'Real: [[um]]\n\n```\nExemplo: [[falso]]\n```\n\nInline `[[tambem-falso]]` e [[dois]].';
  assert.deepEqual(extrairWikilinks(md), ['um', 'dois']);
});

test('extrairWikilinks nao repete o mesmo alvo', () => {
  assert.deepEqual(extrairWikilinks('[[a]] e [[a]] de novo'), ['a']);
});

test('link externo abre em nova aba; interno nao', () => {
  const { html } = renderMarkdown('[fora](https://exemplo.test) e [dentro](outro.html)', semResolver);
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('href="outro.html"></a>') === false);
  assert.ok(html.match(/href="outro\.html"[^>]*>dentro<\/a>/));
});

test('textoPuro separa titulo do paragrafo seguinte', () => {
  const texto = textoPuro('## Qual e a dor hoje\n\nToda proposta com desconto.');
  assert.ok(texto.startsWith('Qual e a dor hoje. Toda proposta'));
});

test('textoPuro remove separador de tabela e marcacao', () => {
  const texto = textoPuro('| A | B |\n|---|---|\n| 1 | 2 |\n\n**forte** e `codigo`');
  assert.ok(!texto.includes('---'));
  assert.ok(texto.includes('forte'));
  assert.ok(texto.includes('codigo'));
});

test('escapeHtml cobre aspas', () => {
  assert.equal(escapeHtml(`<a href="x">'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;');
});
