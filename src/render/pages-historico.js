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
