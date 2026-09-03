import { TIPOS, tomDoStatus } from '../schema.js';
import { escapeHtml } from '../markdown.js';

export const PAGINAS = [
  { href: 'index.html', rotulo: 'Início', chave: 'inicio' },
  { href: 'cards.html', rotulo: 'Cards', chave: 'cards' },
  { href: 'documentos.html', rotulo: 'Documentos', chave: 'documentos' },
  { href: 'busca.html', rotulo: 'Busca', chave: 'busca' },
  { href: 'grafo.html', rotulo: 'Grafo', chave: 'grafo' },
  { href: 'padrao.html', rotulo: 'Padrão', chave: 'padrao' },
  { href: 'historico.html', rotulo: 'Histórico', chave: 'historico' },
];

/**
 * A navegacao do projeto: a mesma de sempre, com dois ajustes quando o
 * projeto tem perfil. O rotulo do eixo muda ("Cards" vira "Decisões" ou
 * "Pastas"), e entra o Mapa, que conta o que a pre-leitura entendeu.
 */
export function paginasDe(projeto) {
  return PAGINAS
    .map((p) => (p.chave === 'cards' && projeto.eixo?.rotuloPlural
      ? { ...p, rotulo: projeto.eixo.rotuloPlural }
      : p))
    .concat(projeto.regime === 'descoberto'
      ? [{ href: 'mapa.html', rotulo: 'Mapa', chave: 'mapa' }]
      : []);
}

/** Casca HTML de toda pagina do site gerado. */
export function pagina({ titulo, chave, projeto, conteudo, livereload = false }) {
  const nav = paginasDe(projeto).map((p) => {
    const atual = p.chave === chave ? ' aria-current="page"' : '';
    return `<a href="${p.href}"${atual}>${p.rotulo}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR" data-theme="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titulo)} · ${escapeHtml(projeto.nome)}</title>
<meta name="description" content="Documentação do projeto ${escapeHtml(projeto.nome)}, gerada pelo Doczilla a partir da pasta docs/.">
<link rel="stylesheet" href="styles.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%235728FF'/%3E%3Crect x='9' y='9' width='14' height='14' rx='4' fill='%231CE65D'/%3E%3C/svg%3E">
</head>
<body>
<header class="topbar">
  <a class="brand" href="index.html">
    <span class="brand-mark"></span>
    <span class="brand-name">Doczilla</span>
    <span class="brand-div"></span>
    <span class="brand-sub">${escapeHtml(projeto.nome)}</span>
  </a>
  <nav class="nav" aria-label="Seções da wiki">${nav}</nav>
  <button class="themer" id="themer" title="Alternar tema claro e escuro" aria-label="Alternar tema claro e escuro">&#9686;</button>
</header>
<div class="wrap">
${conteudo}
${rodape(projeto)}
</div>
<script src="app.js"></script>
${livereload ? '<script src="livereload.js"></script>' : ''}
</body>
</html>
`;
}

function rodape(projeto) {
  const ultima = projeto.historico?.disponivel ? projeto.historico.ultimaAlteracao : null;
  const linhaData = ultima
    ? ` · última atualização por ${escapeHtml(ultima.autor)} em ${dataCurta(ultima.data)}`
    : (projeto.build ? ` · ${escapeHtml(projeto.build)}` : '');
  return `<footer class="footnote">
  <span>${escapeHtml(projeto.nome)} · ${projeto.totalDocs} documentos${linhaData}</span>
  <span>Gerado pelo Doczilla a partir de ${listaDeRaizes(projeto)}</span>
</footer>`;
}

/** "docs/" com uma raiz; "docs/, adr/ e mais 2" quando ha varias. */
export function listaDeRaizes(projeto, limite = 3) {
  const raizes = (projeto.raizes ?? []).map((r) => r.rel);
  if (raizes.length <= 1) return `<code>${escapeHtml(projeto.dirDocs)}/</code>`;
  const mostradas = raizes.slice(0, limite).map((r) => `<code>${escapeHtml(r)}/</code>`).join(', ');
  const resto = raizes.length > limite ? ` e mais ${raizes.length - limite}` : '';
  return `${mostradas}${resto}`;
}

/** "2026-09-02" (formato --date=short do git) vira "02/09" para leitura rapida. */
export function dataCurta(iso) {
  const partes = String(iso).split('-');
  if (partes.length !== 3) return iso;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
}

/* ----------------------------------------------------------------
   Componentes reaproveitados entre paginas
   ---------------------------------------------------------------- */

export function chipTipo(type) {
  const tipo = TIPOS[type];
  if (!tipo) {
    return `<span class="chip" style="--c:var(--neutro)">${escapeHtml(type || 'sem tipo')}</span>`;
  }
  return `<span class="chip" style="--c:var(--${tipo.token})">${escapeHtml(tipo.label)}</span>`;
}

export function chipCard(cardId) {
  if (!cardId) return '';
  return `<span class="chip" style="--c:var(--violet-lift)">${escapeHtml(cardId)}</span>`;
}

export function pillStatus(status) {
  if (!status) return '';
  const tom = tomDoStatus(status);
  const classe = tom === 'neutro' ? '' : ` ${tom}`;
  return `<span class="st${classe}">${escapeHtml(status)}</span>`;
}

export function secao({ label, lead, corpo, bare = false }) {
  return `<section class="sec">
  <div class="sec-head${bare ? ' bare' : ''}">
    <h2 class="sec-label">${escapeHtml(label)}</h2>
    <p class="sec-lead">${lead}</p>
  </div>
  ${corpo}
</section>`;
}

export function migalha(itens) {
  const partes = itens.map((item, i) => {
    const sep = i > 0 ? '<span class="sep">/</span>' : '';
    const corpo = item.href
      ? `<a href="${item.href}">${escapeHtml(item.rotulo)}</a>`
      : escapeHtml(item.rotulo);
    return sep + corpo;
  });
  return `<nav class="crumb" aria-label="Trilha">${partes.join('')}</nav>`;
}

export function metaKv(pares) {
  const itens = pares
    .filter(([, valor]) => valor)
    .map(([chave, valor]) => `<div class="meta-kv">
      <span class="meta-k">${escapeHtml(chave)}</span>
      <span class="meta-v">${escapeHtml(valor)}</span>
    </div>`)
    .join('');
  return itens ? `<div class="metarow kv">${itens}</div>` : '';
}

/** Quadradinhos de cobertura: quais tipos o card ja tem e quais faltam. */
export function trilhaDots(card) {
  const tipos = Object.keys(TIPOS).filter((t) => TIPOS[t].exigeCard);
  return tipos
    .map((t) => {
      const tipo = TIPOS[t];
      if (card.tiposPresentes.has(t)) {
        return `<span class="dot" style="--c:var(--${tipo.token})" title="${escapeHtml(tipo.label)}"></span>`;
      }
      return `<span class="dot off" title="${escapeHtml(tipo.label)}: ausente"></span>`;
    })
    .join('');
}
