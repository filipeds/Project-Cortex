import { TIPOS, ORDEM_TIPOS } from '../schema.js';
import { escapeHtml, renderMarkdown } from '../markdown.js';
import { regrasDoCard, cardsRelacionados } from '../graph.js';
import {
  pagina, migalha, chipTipo, chipCard, pillStatus, metaKv,
} from './layout.js';

/* ----------------------------------------------------------------
   Pagina de card: a trilha
   ---------------------------------------------------------------- */

export function renderCard({ card, grafo, projeto }) {
  const regras = regrasDoCard(card, grafo);
  const relacionados = cardsRelacionados(card, grafo);

  const conteudo = `
${migalha([
    { rotulo: projeto.nome, href: 'index.html' },
    { rotulo: 'Cards', href: 'cards.html' },
    { rotulo: card.id },
  ])}

<header class="pagehead">
  <div class="metarow">
    ${chipCard(card.id)}
    ${pillStatus(card.status)}
    ${card.sprint ? `<span class="st plain">${escapeHtml(card.sprint)}</span>` : ''}
  </div>
  <h1>${escapeHtml(card.title)}</h1>
  ${metaKv([
    ['Documentos', String(card.docs.length)],
    ['Primeiro registro', primeiraData(card)],
    ['Última atualização', card.updated],
    ['Cobertura', `${card.tiposPresentes.size} de ${ORDEM_TIPOS.filter((t) => TIPOS[t].exigeCard).length} tipos`],
  ])}
</header>

<div class="split">
  <div class="trail">
    ${trilha(card)}
  </div>
  <aside>
    ${painelComponentes(card)}
    ${painelRegras(regras)}
    ${painelRelacionados(relacionados)}
  </aside>
</div>
`;

  return pagina({ titulo: card.id, chave: 'cards', projeto, conteudo, livereload: projeto.livereload });
}

function primeiraData(card) {
  return card.docs.map((d) => d.updated).filter(Boolean).sort()[0] ?? '';
}

function trilha(card) {
  const presentes = card.docs.map((doc, i) => {
    const tipo = TIPOS[doc.type];
    const token = tipo ? tipo.token : 'neutro';
    return `<div class="tr">
  <div class="tr-node" style="--c:var(--${token})">${i + 1}</div>
  <a class="tr-body" href="${doc.href}">
    <div class="tr-top">${chipTipo(doc.type)}${pillStatus(doc.status)}</div>
    <h3>${escapeHtml(doc.title)}</h3>
    <p>${escapeHtml(recorte(doc.texto, 190))}</p>
    <code class="tr-path">${escapeHtml(doc.relPath)}</code>
  </a>
</div>`;
  }).join('');

  // O que falta tambem faz parte da historia do card, entao entra na trilha
  // como item tracejado em vez de sumir da tela.
  const faltando = card.tiposFaltando.map((type) => {
    const tipo = TIPOS[type];
    return `<div class="tr faltando">
  <div class="tr-node">·</div>
  <div class="tr-body">
    <div class="tr-top"><span class="chip" style="--c:var(--neutro)">${escapeHtml(tipo.label)}</span></div>
    <h3>Ainda não escrito</h3>
    <p>${escapeHtml(tipo.resumo)}</p>
    <code class="tr-path">docs/${tipo.dir}/${escapeHtml(card.id)}-....md</code>
  </div>
</div>`;
  }).join('');

  return presentes + faltando;
}

function recorte(texto, limite) {
  const limpo = String(texto).trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite);
  return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
}

function painelComponentes(card) {
  if (!card.components.length) return '';
  const itens = card.components
    .map((c) => `<li><span class="tick">&#9656;</span><code>${escapeHtml(c)}</code></li>`)
    .join('');
  return `<div class="side">
  <h4>Componentes tocados</h4>
  <ul>${itens}</ul>
</div>`;
}

function painelRegras(regras) {
  if (!regras.length) return '';
  const itens = regras
    .map((r) => `<li><span class="tick" style="color:var(--t-regra)">&#9656;</span><a href="${r.href}">${escapeHtml(r.title)}</a></li>`)
    .join('');
  return `<div class="side">
  <h4>Regras referenciadas</h4>
  <ul>${itens}</ul>
</div>`;
}

function painelRelacionados(relacionados) {
  if (!relacionados.length) return '';
  const itens = relacionados
    .map(({ card, motivo }) => `<li><span class="tick">&#9656;</span><span><a href="${card.href}"><code>${escapeHtml(card.id)}</code></a> — ${escapeHtml(motivo)}</span></li>`)
    .join('');
  return `<div class="side">
  <h4>Cards relacionados</h4>
  <ul>${itens}</ul>
</div>`;
}

/* ----------------------------------------------------------------
   Pagina de documento
   ---------------------------------------------------------------- */

export function renderDocumento({ doc, grafo, projeto }) {
  const tipo = TIPOS[doc.type];
  const resolver = (nome) => {
    const alvo = grafo.resolver(nome);
    if (!alvo) return null;
    return {
      href: alvo.href,
      label: alvo.title,
      token: TIPOS[alvo.type]?.token ?? 'violet-lift',
    };
  };

  // Link relativo escrito a mao aponta para um .md que nao existe na saida
  // plana. Passa pelo mesmo resolvedor do grafo e vira link de documento.
  const resolverHref = (href) => {
    const alvo = grafo.resolverHrefDe?.(doc)(href);
    if (!alvo) return null;
    return { href: alvo.href, label: alvo.title, token: TIPOS[alvo.type]?.token ?? 'violet-lift' };
  };

  const { html, toc } = renderMarkdown(doc.body, { resolver, resolverHref });
  const secoes = toc.filter((t) => t.nivel === 2);

  const entradas = doc.entradas.map((id) => grafo.doc(id)).filter(Boolean);
  const saidas = doc.saidas.map((id) => grafo.doc(id)).filter(Boolean);

  const conteudo = `
${migalha([
    { rotulo: projeto.nome, href: 'index.html' },
    { rotulo: tipo ? tipo.plural : 'Documentos', href: 'documentos.html' },
    { rotulo: doc.relPath.split('/').pop() },
  ])}

<header class="pagehead">
  <div class="metarow">
    ${chipTipo(doc.type)}
    ${doc.card ? `<a href="card-${slugCard(doc.card)}.html">${chipCard(doc.card)}</a>` : ''}
    ${pillStatus(doc.status)}
  </div>
  <h1>${escapeHtml(doc.title)}</h1>
  ${metaKv([
    ['Atualizado', doc.updated],
    ['Revisado por', doc.reviewer],
    ['Severidade', doc.severity],
    ['Implantado', doc.deployed],
    ['Ligações', `${saidas.length} ${saidas.length === 1 ? 'saída' : 'saídas'} · ${entradas.length} ${entradas.length === 1 ? 'entrada' : 'entradas'}`],
  ])}
</header>

<div class="split doc">
  ${secoes.length ? sumario(secoes) : '<div></div>'}
  <article>
    ${blocoFrontmatter(doc)}
    <div class="prose">${html}</div>
  </article>
  <aside>
    ${painelBacklinks(entradas)}
    ${painelSaidas(saidas)}
    ${painelTags(doc)}
  </aside>
</div>
`;

  return pagina({ titulo: doc.title, chave: 'documentos', projeto, conteudo, livereload: projeto.livereload });
}

function slugCard(cardId) {
  return String(cardId)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sumario(secoes) {
  const itens = secoes
    .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.texto)}</a></li>`)
    .join('');
  return `<aside class="toc">
  <h4>Nesta página</h4>
  <ol>${itens}</ol>
</aside>`;
}

/**
 * Mostra o frontmatter na propria pagina. E de proposito: quem le a wiki
 * aprende o padrao vendo o metadado que o gerou, sem abrir o arquivo.
 */
function blocoFrontmatter(doc) {
  const ordem = ['type', 'title', 'card', 'status', 'severity', 'deployed', 'sprint', 'reviewer', 'tags', 'components', 'related', 'updated'];
  const chaves = [...new Set([...ordem, ...Object.keys(doc.data)])]
    .filter((k) => doc.data[k] !== undefined && doc.data[k] !== '' && !(Array.isArray(doc.data[k]) && !doc.data[k].length));

  const linhas = chaves.map((chave) => {
    const valor = doc.data[chave];
    if (Array.isArray(valor)) {
      const itens = valor
        .map((v) => `  <span class="d">-</span> <span class="${chave === 'related' ? 'l' : 'v'}">${escapeHtml(v)}</span>`)
        .join('\n');
      return `<span class="k">${escapeHtml(chave)}</span><span class="d">:</span>\n${itens}`;
    }
    return `<span class="k">${escapeHtml(chave)}</span><span class="d">:</span> <span class="v">${escapeHtml(String(valor))}</span>`;
  }).join('\n');

  return `<div class="fm"><span class="d">---</span>
${linhas}
<span class="d">---</span></div>`;
}

function painelBacklinks(entradas) {
  if (!entradas.length) {
    return `<div class="side">
  <h4>Backlinks</h4>
  <p style="margin:0; font-size:14px; color:var(--text-mute)">Nenhum documento aponta para este ainda.</p>
</div>`;
  }
  const itens = entradas.map((d) => `<a class="backlink" href="${d.href}">
  <span class="bt">${chipTipo(d.type)}</span>
  <span class="bn">${escapeHtml(d.title)}</span>
  <code class="bp">${escapeHtml(d.relPath)}</code>
</a>`).join('');
  return `<div class="side">
  <h4>Backlinks · ${entradas.length} ${entradas.length === 1 ? 'entrada' : 'entradas'}</h4>
  ${itens}
</div>`;
}

function painelSaidas(saidas) {
  if (!saidas.length) return '';
  const itens = saidas.map((d) => {
    const token = TIPOS[d.type]?.token ?? 'violet-lift';
    return `<li><span class="tick" style="color:var(--${token})">&#9656;</span><a href="${d.href}">${escapeHtml(d.title)}</a></li>`;
  }).join('');
  return `<div class="side">
  <h4>Aponta para · ${saidas.length} ${saidas.length === 1 ? 'saída' : 'saídas'}</h4>
  <ul>${itens}</ul>
</div>`;
}

function painelTags(doc) {
  if (!doc.tags.length && !doc.components.length) return '';
  const tags = doc.tags.length
    ? `<h4>Tags</h4><div class="metarow">${doc.tags.map((t) => `<span class="st plain">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  const comps = doc.components.length
    ? `<h4${tags ? ' style="margin-top:20px"' : ''}>Componentes</h4><ul>${doc.components.map((c) => `<li><span class="tick">&#9656;</span><code>${escapeHtml(c)}</code></li>`).join('')}</ul>`
    : '';
  return `<div class="side">${tags}${comps}</div>`;
}
