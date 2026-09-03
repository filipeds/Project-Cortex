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
