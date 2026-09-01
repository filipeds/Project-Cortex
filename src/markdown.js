/**
 * Renderer Markdown proprio.
 *
 * Cobre o que o padrao do Doczilla usa: titulos, paragrafos, listas aninhadas,
 * tabelas, blocos de codigo, citacoes, regras horizontais e os inlines usuais,
 * mais a sintaxe [[wikilink]] que e a razao de nao usarmos um renderer pronto.
 * Nao aceita HTML cru no meio do Markdown: tudo e escapado.
 */

const RE_FENCE = /^(```|~~~)\s*([\w+-]*)\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const RE_HR = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;
const RE_UL = /^(\s*)([-*+])\s+(.*)$/;
const RE_OL = /^(\s*)(\d+)[.)]\s+(.*)$/;
const RE_TABLE_SEP = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/;
const RE_LINK_MD = /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g;
const RE_WIKILINK = /\[\[([^\]|[]+?)(?:\|([^\][]+?))?\]\]/g;

export function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'secao';
}

/** Remove codigo antes de varrer wikilinks, senao exemplos viram ligacao real. */
function semCodigo(md) {
  return String(md)
    .replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

/** Nomes referenciados por [[...]] no corpo, sem repeticao e na ordem de uso. */
export function extrairWikilinks(md) {
  const encontrados = [];
  const limpo = semCodigo(md);
  for (const achado of limpo.matchAll(RE_WIKILINK)) {
    const nome = achado[1].trim();
    if (nome && !encontrados.includes(nome)) encontrados.push(nome);
  }
  return encontrados;
}

/**
 * Alvos de [texto](caminho.md) escritos a mao no corpo.
 *
 * Existe porque projeto que ja tinha documentacao antes do Doczilla nao usa
 * [[wikilink]]: usa link relativo comum. As duas formas dizem a mesma coisa —
 * "este documento fala daquele" — e viram a mesma aresta no grafo.
 */
export function extrairLinksRelativos(md) {
  const encontrados = [];
  const limpo = semCodigo(md);
  for (const achado of limpo.matchAll(RE_LINK_MD)) {
    // Imagem nao e ligacao entre documentos.
    if (achado[1] === '!') continue;
    const alvo = achado[3].trim();
    if (!ehCaminhoDeDocumento(alvo)) continue;
    if (!encontrados.includes(alvo)) encontrados.push(alvo);
  }
  return encontrados;
}

/**
 * Esquemas de URL que podem sair no HTML gerado.
 *
 * E uma lista de permissao, nao de proibicao: `[texto](javascript:...)` num
 * documento vira codigo rodando no navegador de quem abre a wiki, e a wiki e
 * um arquivo que circula por e-mail e rede interna. Documento e conteudo, nao
 * programa. Caminho relativo e ancora nao tem esquema e passam direto.
 */
const ESQUEMAS_PERMITIDOS = new Set(['http', 'https', 'mailto', 'tel', 'ftp']);

export function hrefSeguro(href) {
  const alvo = String(href).trim();
  // Tira espaco e caractere de controle antes de olhar o esquema: o navegador
  // ignora esses bytes ao seguir o link, entao "java<TAB>script:" roda igual a
  // "javascript:" e passaria batido por uma verificacao ingenua.
  const limpo = alvo.replace(/[\u0000-\u0020\u007f]/g, '');
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(limpo);
  if (!esquema) return alvo;
  return ESQUEMAS_PERMITIDOS.has(esquema[1].toLowerCase()) ? alvo : '';
}

/**
 * Fica de fora tudo que nao aponta para outro documento do projeto: URL
 * externa, mailto, ancora da propria pagina e caminho absoluto.
 */
export function ehCaminhoDeDocumento(href) {
  const alvo = String(href).trim();
  if (!alvo || alvo.startsWith('#')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(alvo)) return false;
  if (alvo.startsWith('/')) return false;
  return /\.md(?:#.*)?$/i.test(alvo);
}

/**
 * @param {string} md
 * @param {{resolver?: (nome: string) => ({href: string, label?: string, token?: string} | null)}} opcoes
 * @returns {{html: string, toc: Array<{nivel: number, texto: string, id: string}>}}
 */
export function renderMarkdown(md, opcoes = {}) {
  const ctx = {
    resolver: opcoes.resolver ?? (() => null),
    resolverHref: opcoes.resolverHref ?? (() => null),
    toc: [],
    idsUsados: new Set(),
  };
  const linhas = String(md).replace(/\r\n?/g, '\n').split('\n');
  const html = renderBlocos(linhas, ctx);
  return { html, toc: ctx.toc };
}

function renderBlocos(linhas, ctx) {
  const saida = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (!linha.trim()) {
      i += 1;
      continue;
    }

    const fence = linha.match(RE_FENCE);
    if (fence) {
      const [, marca, lang] = fence;
      const corpo = [];
      i += 1;
      while (i < linhas.length && !(linhas[i].trimEnd() === marca || linhas[i].startsWith(marca))) {
        corpo.push(linhas[i]);
        i += 1;
      }
      i += 1; // consome o fechamento
      const classe = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      saida.push(`<pre class="codebox"${classe}><code>${escapeHtml(corpo.join('\n'))}</code></pre>`);
      continue;
    }

    if (RE_HR.test(linha)) {
      saida.push('<hr>');
      i += 1;
      continue;
    }

    const heading = linha.match(RE_HEADING);
    if (heading) {
      const nivel = heading[1].length;
      const texto = heading[2].trim();
      const id = idUnico(slugify(texto), ctx);
      ctx.toc.push({ nivel, texto, id });
      saida.push(`<h${nivel} id="${id}">${inline(texto, ctx)}</h${nivel}>`);
      i += 1;
      continue;
    }

    if (RE_QUOTE.test(linha)) {
      const corpo = [];
      while (i < linhas.length && (RE_QUOTE.test(linhas[i]) || (corpo.length && linhas[i].trim()))) {
        const achado = linhas[i].match(RE_QUOTE);
        corpo.push(achado ? achado[1] : linhas[i].trim());
        i += 1;
      }
      saida.push(`<blockquote>${renderBlocos(corpo, ctx)}</blockquote>`);
      continue;
    }

    if (linha.includes('|') && RE_TABLE_SEP.test(linhas[i + 1] ?? '')) {
      const { html, proxima } = renderTabela(linhas, i, ctx);
      saida.push(html);
      i = proxima;
      continue;
    }

    if (RE_UL.test(linha) || RE_OL.test(linha)) {
      const { html, proxima } = renderLista(linhas, i, ctx);
      saida.push(html);
      i = proxima;
      continue;
    }

    // Paragrafo: acumula ate a linha em branco ou o inicio de outro bloco.
    const paragrafo = [];
    while (i < linhas.length && linhas[i].trim() && !ehInicioDeBloco(linhas, i)) {
      paragrafo.push(linhas[i].trim());
      i += 1;
    }
    if (paragrafo.length) saida.push(`<p>${inline(paragrafo.join(' '), ctx)}</p>`);
  }

  return saida.join('\n');
}

function ehInicioDeBloco(linhas, i) {
  const linha = linhas[i];
  return (
    RE_FENCE.test(linha)
    || RE_HEADING.test(linha)
    || RE_HR.test(linha)
    || RE_QUOTE.test(linha)
    || RE_UL.test(linha)
    || RE_OL.test(linha)
    || (linha.includes('|') && RE_TABLE_SEP.test(linhas[i + 1] ?? ''))
  );
}

function idUnico(base, ctx) {
  let id = base;
  let n = 2;
  while (ctx.idsUsados.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  ctx.idsUsados.add(id);
  return id;
}

function celulas(linha) {
  return linha
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderTabela(linhas, inicio, ctx) {
  const cabecalho = celulas(linhas[inicio]);
  const alinhamentos = celulas(linhas[inicio + 1]).map((sep) => {
    const esq = sep.startsWith(':');
    const dir = sep.endsWith(':');
    if (esq && dir) return 'center';
    if (dir) return 'right';
    return 'left';
  });

  let i = inicio + 2;
  const corpo = [];
  while (i < linhas.length && linhas[i].trim() && linhas[i].includes('|')) {
    corpo.push(celulas(linhas[i]));
    i += 1;
  }

  const estilo = (idx) => (alinhamentos[idx] && alinhamentos[idx] !== 'left'
    ? ` style="text-align:${alinhamentos[idx]}"`
    : '');

  const ths = cabecalho.map((c, idx) => `<th${estilo(idx)}>${inline(c, ctx)}</th>`).join('');
  const trs = corpo
    .map((linha) => {
      const tds = cabecalho
        .map((_, idx) => `<td${estilo(idx)}>${inline(linha[idx] ?? '', ctx)}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  const html = `<div class="tablewrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  return { html, proxima: i };
}

function renderLista(linhas, inicio, ctx) {
  const primeira = linhas[inicio].match(RE_UL) || linhas[inicio].match(RE_OL);
  const ordenada = RE_OL.test(linhas[inicio]);
  const recuoBase = primeira[1].length;

  const itens = [];
  let i = inicio;

  while (i < linhas.length) {
    const linha = linhas[i];
    if (!linha.trim()) {
      // Linha em branco so encerra a lista se o proximo item nao continuar nela.
      const proxima = linhas[i + 1] ?? '';
      const continua = (RE_UL.test(proxima) || RE_OL.test(proxima))
        && (proxima.match(RE_UL) || proxima.match(RE_OL))[1].length >= recuoBase;
      const continuaRecuado = proxima.startsWith(' '.repeat(recuoBase + 2)) && proxima.trim();
      if (!continua && !continuaRecuado) break;
      if (itens.length) itens[itens.length - 1].linhas.push('');
      i += 1;
      continue;
    }

    const achado = linha.match(RE_UL) || linha.match(RE_OL);
    const recuo = achado ? achado[1].length : Infinity;

    if (achado && recuo === recuoBase && RE_OL.test(linha) === ordenada) {
      itens.push({ linhas: [achado[3]] });
      i += 1;
      continue;
    }
    if (recuo < recuoBase && achado) break;
    if (!itens.length) break;

    // Continuacao do item corrente (paragrafo solto ou lista aninhada).
    if (linha.startsWith(' '.repeat(recuoBase + 1)) || (achado && recuo > recuoBase)) {
      itens[itens.length - 1].linhas.push(linha.slice(recuoBase + 2));
      i += 1;
      continue;
    }
    break;
  }

  const tag = ordenada ? 'ol' : 'ul';
  const lis = itens
    .map((item) => {
      // O primeiro paragrafo do item perde o <p>: sem isso, item com lista
      // aninhada ganha margem dupla e a lista fica frouxa.
      const conteudo = renderBlocos(item.linhas, ctx).replace(/^<p>([\s\S]*?)<\/p>/, '$1');
      return `<li>${conteudo}</li>`;
    })
    .join('');

  return { html: `<${tag}>${lis}</${tag}>`, proxima: i };
}

/* ----------------------------------------------------------------
   Inline
   ---------------------------------------------------------------- */

function inline(texto, ctx) {
  const codigos = [];
  // Trechos de codigo saem de cena antes de qualquer outra substituicao para
  // que `**isto**` dentro de crase continue literal.
  let out = String(texto).replace(/`([^`]+)`/g, (_, codigo) => {
    codigos.push(codigo);
    return ` CODE${codigos.length - 1} `;
  });

  out = escapeHtml(out);

  out = out.replace(RE_WIKILINK, (bruto, nomeCru, rotuloCru) => {
    const nome = nomeCru.trim();
    const alvo = ctx.resolver(nome);
    const rotulo = (rotuloCru ?? alvo?.label ?? nome).trim();
    if (!alvo) {
      return `<span class="wl wl-quebrado" title="Nenhum documento com esse nome">${rotulo}</span>`;
    }
    const token = alvo.token ? ` style="--c:var(--${alvo.token})"` : '';
    return `<a class="wl" href="${escapeHtml(alvo.href)}"${token}>${rotulo}</a>`;
  });

  out = out
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
      const seguro = hrefSeguro(src);
      if (!seguro) return `<span class="wl wl-quebrado" title="Endereço de imagem bloqueado">${alt}</span>`;
      return `<img src="${seguro}" alt="${alt}" loading="lazy">`;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, rotulo, href) => {
      // Link relativo para outro .md aponta para um arquivo que nao existe na
      // saida plana. Quando ele resolve para um documento, trocamos o href pela
      // pagina correspondente; quando nao resolve, fica como o autor escreveu.
      const alvo = ehCaminhoDeDocumento(href) ? ctx.resolverHref(href) : null;
      if (alvo) {
        const token = alvo.token ? ` style="--c:var(--${alvo.token})"` : '';
        return `<a class="wl" href="${escapeHtml(alvo.href)}"${token}>${rotulo}</a>`;
      }
      // Esquema fora da lista de permissao nao vira link: o texto continua
      // legivel, mas nao ha o que clicar. Ver hrefSeguro().
      const seguro = hrefSeguro(href);
      if (!seguro) {
        return `<span class="wl wl-quebrado" title="Endereço de link bloqueado por segurança">${rotulo}</span>`;
      }
      const externo = /^https?:/i.test(seguro);
      const extra = externo ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${seguro}"${extra}>${rotulo}</a>`;
    })
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');

  return out.replace(/ CODE(\d+) /g, (_, idx) => `<code>${escapeHtml(codigos[Number(idx)])}</code>`);
}

/** Texto puro do corpo, para excerto e indice de busca. */
export function textoPuro(md) {
  return String(md)
    .replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, ' ')
    .replace(/`([^`\n]*)`/g, '$1')
    .replace(RE_WIKILINK, (_, nome, rotulo) => (rotulo ?? nome))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // O titulo da secao vira frase: sem isso o excerto cola cabecalho e
    // paragrafo ("Qual e a dor hoje Toda proposta com...").
    .replace(/^#{1,6}\s+(.*?)\s*$/gm, '$1. ')
    .replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
