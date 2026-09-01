import { TIPOS, ORDEM_TIPOS } from '../schema.js';
import { escapeHtml } from '../markdown.js';
import {
  pagina, secao, chipTipo, pillStatus, trilhaDots, chipCard, listaDeRaizes,
} from './layout.js';

/**
 * O eixo tem nome proprio em cada projeto: "Card" onde o time trabalha por
 * ticket, "Decisão" num repositorio de ADRs, "Pasta" quando o unico
 * agrupamento que existe e a arvore de diretorios. Todo texto de tela que
 * falava "card" passa por aqui.
 */
function eixoDe(grafo) {
  return grafo.eixo ?? { modo: 'card', rotulo: 'Card', rotuloPlural: 'Cards' };
}

export function renderHome({ grafo, avisos, resumo, validos, projeto }) {
  const eixo = eixoDe(grafo);
  const contagem = contarPorTipo(grafo.docs);
  const recentes = [...grafo.cards]
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
    .slice(0, 6);

  const conteudo = `
${hero(grafo, resumo, validos, projeto)}

${secao({
    label: 'Tipos de documentação',
    lead: '<b>Seis tipos, fixos em todo projeto.</b> O campo <code>type</code> no frontmatter define qual é qual, e cada tipo tem seus próprios campos obrigatórios, conferidos no build.',
    corpo: `<div class="grid3">${ORDEM_TIPOS.map((t) => cardTipo(t, contagem[t] ?? 0)).join('')}</div>`,
  })}

${secao({
    label: `${eixo.rotuloPlural} recentes`,
    lead: leadDoEixo(eixo),
    corpo: recentes.length
      ? `<div class="grid3">${recentes.map(cardResumo).join('')}</div>`
      : `<div class="vazio">${vazioDoEixo(eixo)}</div>`,
  })}

${secao({
    label: 'Saúde da documentação',
    lead: '<b>O build valida o padrão e não falha por isso.</b> Ele avisa, gera a wiki mesmo assim e marca o que precisa de atenção, para que ninguém fique sem site por causa de um campo esquecido.',
    corpo: listaAvisos(avisos, projeto),
  })}
`;

  return pagina({ titulo: 'Início', chave: 'inicio', projeto, conteudo, livereload: projeto.livereload });
}

/** O texto que apresenta o eixo na home. */
function leadDoEixo(eixo) {
  if (eixo.modo === 'card') {
    return '<b>O card é o eixo.</b> Os quadradinhos mostram quais tipos de documento já existem para cada card, e quais ainda faltam.';
  }
  if (eixo.modo === 'chave') {
    return `<b>${escapeHtml(eixo.rotuloPlural)} são o eixo</b>, reconhecidos pela marca que se repete no nome dos arquivos. Os quadradinhos mostram quais tipos de documento já existem em cada ${escapeHtml(eixo.rotulo.toLowerCase())}.`;
  }
  return '<b>A pasta é o eixo.</b> Cada grupo abaixo é uma pasta do projeto, com os documentos que moram nela — é a organização que a equipe já escolheu.';
}

function vazioDoEixo(eixo) {
  if (eixo.modo === 'card') return 'Nenhum documento declarou o campo <b>card</b> ainda.';
  if (eixo.modo === 'chave') return `Nenhum documento tem a marca que identifica ${escapeHtml(eixo.rotuloPlural.toLowerCase())}.`;
  return 'Nenhuma pasta com documentos foi encontrada.';
}

function hero(grafo, resumo, validos, projeto) {
  const eixo = eixoDe(grafo);
  const rotulo = escapeHtml(eixo.rotulo.toLowerCase());
  return `<section class="hero">
  <p class="eyebrow">${escapeHtml(projeto.nome)}${projeto.plataforma ? ` · ${escapeHtml(projeto.plataforma)}` : ''}${projeto.build ? ` · ${escapeHtml(projeto.build)}` : ''}</p>
  <h1>Tudo que o time escreveu, <em>ligado pelo ${rotulo}</em>.</h1>
  <p>O Doczilla leu ${grafo.docs.length} arquivos Markdown dentro de ${listaDeRaizes(projeto)}, reconheceu o tipo de cada um pelo frontmatter e reconstruiu as ligações entre eles. Nenhum link foi escrito à mão.</p>
  <div class="btnrow">
    <a class="pill" href="cards.html">Explorar por ${rotulo}</a>
    <a class="arrowbtn solid" href="cards.html" aria-label="Explorar por ${rotulo}">&rarr;</a>
    <a class="pill-ghost" href="busca.html">Buscar na documentação</a>
  </div>
  <div class="figures">
    <div class="fig"><div class="fig-n">${grafo.docs.length}</div><div class="fig-l">documentos</div></div>
    <div class="fig"><div class="fig-n">${grafo.cards.length}</div><div class="fig-l">${escapeHtml(eixo.rotuloPlural.toLowerCase())} mapeados</div></div>
    <div class="fig"><div class="fig-n">${contarLigacoes(grafo)}</div><div class="fig-l">ligações</div></div>
    <div class="fig"><div class="fig-n g">${validos}</div><div class="fig-l">válidos</div></div>
    <div class="fig"><div class="fig-n ${resumo.crit ? 'c' : 'w'}">${resumo.crit + resumo.warn}</div><div class="fig-l">com aviso</div></div>
  </div>
</section>`;
}

function contarLigacoes(grafo) {
  const wikilinks = grafo.docs.reduce((soma, doc) => soma + doc.saidas.length, 0);
  // Cada card liga seus documentos entre si: sao os pares dentro do card.
  const porCard = grafo.cards.reduce((soma, card) => {
    const n = card.docs.length;
    return soma + (n * (n - 1)) / 2;
  }, 0);
  return wikilinks + porCard;
}

function contarPorTipo(docs) {
  const contagem = {};
  for (const doc of docs) {
    if (!doc.type) continue;
    contagem[doc.type] = (contagem[doc.type] ?? 0) + 1;
  }
  return contagem;
}

function cardTipo(type, quantidade) {
  const tipo = TIPOS[type];
  return `<a class="tcard" style="--c:var(--${tipo.token})" href="documentos.html#${type}">
  <div class="tcard-top"><h3>${escapeHtml(tipo.label)}</h3><span class="cnt">${quantidade}</span></div>
  <p>${escapeHtml(tipo.resumo)}</p>
  <span class="slug">type: ${type}</span>
</a>`;
}

function cardResumo(card) {
  return `<a class="ccard" href="${card.href}">
  <span class="ccard-id">${escapeHtml(card.id)}</span>
  <h3>${escapeHtml(card.title)}</h3>
  <div class="dotline">${trilhaDots(card)}</div>
  <div class="ccard-foot">
    <span>${card.docs.length} ${card.docs.length === 1 ? 'documento' : 'documentos'}</span>
    ${pillStatus(card.status)}
  </div>
</a>`;
}

function listaAvisos(avisos, projeto) {
  if (!avisos.length) {
    return '<div class="vazio">Nenhum aviso. Todos os documentos seguem o padrão e todas as ligações resolvem.</div>';
  }
  const linhas = avisos.slice(0, 12).map((aviso) => {
    const tom = aviso.nivel === 'crit' ? 'crit' : (aviso.nivel === 'warn' ? 'warn' : 'plain');
    return `<div class="hrow">
  <span class="st ${tom}">${escapeHtml(aviso.categoria)}</span>
  <span class="msg">${aviso.mensagem}</span>
  <code>${escapeHtml(aviso.onde)}</code>
</div>`;
  }).join('');

  const invocacao = projeto?.invocacao ?? 'node bin/doczilla.js';
  const resto = avisos.length > 12
    ? `<div class="hrow"><span class="st plain">e mais</span><span class="msg">${avisos.length - 12} avisos não listados aqui. Rode <code>${escapeHtml(invocacao)} build</code> para ver todos no terminal.</span><code></code></div>`
    : '';

  return `<div class="hlist">${linhas}${resto}</div>`;
}

/* ----------------------------------------------------------------
   Listagens
   ---------------------------------------------------------------- */

export function renderListaCards({ grafo, projeto }) {
  const eixo = eixoDe(grafo);
  const corpo = grafo.cards.length
    ? `<div class="grid3">${grafo.cards.map(cardResumo).join('')}</div>`
    : `<div class="vazio">${vazioDoEixo(eixo)}</div>`;

  const semSpec = eixo.modo === 'card'
    ? grafo.cards.filter((c) => !c.tiposPresentes.has('spec')).length
    : 0;

  const plural = escapeHtml(eixo.rotuloPlural.toLowerCase());
  const comoAparece = {
    card: 'Um card aparece aqui assim que qualquer documento declara o campo <code>card</code>',
    chave: `Cada ${escapeHtml(eixo.rotulo.toLowerCase())} reúne os documentos que trazem a mesma marca no nome`,
    pasta: 'Cada grupo é uma pasta do projeto, com os documentos que moram nela',
  }[eixo.modo];

  const conteudo = secao({
    bare: true,
    label: eixo.rotuloPlural,
    lead: `<b>${grafo.cards.length} ${plural} mapeados.</b> ${comoAparece}${semSpec ? `, e ${semSpec} ${semSpec === 1 ? 'ainda está' : 'ainda estão'} sem spec` : ''}.`,
    corpo,
  });

  return pagina({ titulo: eixo.rotuloPlural, chave: 'cards', projeto, conteudo, livereload: projeto.livereload });
}

export function renderListaDocumentos({ grafo, projeto }) {
  const grupos = ORDEM_TIPOS
    .map((type) => ({ type, docs: grafo.docs.filter((d) => d.type === type) }))
    .filter((g) => g.docs.length);

  const semTipo = grafo.docs.filter((d) => !d.type || !TIPOS[d.type]);
  if (semTipo.length) grupos.push({ type: '', docs: semTipo });

  const blocos = grupos.map(({ type, docs }) => {
    const tipo = TIPOS[type];
    const label = tipo ? tipo.plural : 'Sem tipo reconhecido';
    const lead = tipo
      ? escapeHtml(tipo.resumo)
      : 'Documentos cujo campo <code>type</code> está ausente ou fora do padrão. Eles aparecem na busca, mas não entram na trilha de nenhum card.';
    const linhas = docs
      .slice()
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title, 'pt-BR'))
      .map(linhaDoc)
      .join('');
    return `<section class="sec" id="${type || 'sem-tipo'}">
  <div class="sec-head">
    <h2 class="sec-label">${escapeHtml(label)} · ${docs.length}</h2>
    <p class="sec-lead">${lead}</p>
  </div>
  <div class="dlist">${linhas}</div>
</section>`;
  }).join('');

  const conteudo = `<div class="crumb" style="margin-bottom:0"></div>${blocos || '<div class="vazio">Nenhum documento encontrado.</div>'}`;

  return pagina({ titulo: 'Documentos', chave: 'documentos', projeto, conteudo, livereload: projeto.livereload });
}

function linhaDoc(doc) {
  return `<a class="drow" href="${doc.href}">
  ${chipTipo(doc.type)}
  <span>
    <span class="dt">${escapeHtml(doc.title)}</span>
    <code class="dp">${escapeHtml(doc.relPath)}</code>
  </span>
  ${doc.card ? chipCard(doc.card) : '<span></span>'}
  <span class="du">${escapeHtml(doc.updated || '—')}</span>
</a>`;
}
