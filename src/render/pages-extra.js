import { TIPOS, ORDEM_TIPOS, CAMPOS_COMUNS, tomDoStatus } from '../schema.js';
import { escapeHtml } from '../markdown.js';
import { pagina, secao, chipTipo } from './layout.js';

/* ----------------------------------------------------------------
   Busca
   ---------------------------------------------------------------- */

export function renderBusca({ grafo, projeto }) {
  // O indice vai embutido na propria pagina: fetch de JSON e bloqueado em
  // file://, e a wiki precisa buscar mesmo aberta por duplo clique.
  const indice = grafo.docs.map((doc) => ({
    title: doc.title,
    href: doc.href,
    relPath: doc.relPath,
    type: doc.type,
    tipoLabel: TIPOS[doc.type]?.label ?? 'Sem tipo',
    token: TIPOS[doc.type]?.token ?? 'neutro',
    card: doc.card,
    status: doc.status,
    tom: tomDoStatus(doc.status),
    tags: doc.tags,
    texto: doc.texto.slice(0, 4000),
  }));

  const contagem = {};
  for (const doc of grafo.docs) contagem[doc.type] = (contagem[doc.type] ?? 0) + 1;

  const filtros = [
    `<button class="fchip" data-tipo="todos" aria-pressed="true">Todos · ${grafo.docs.length}</button>`,
    ...ORDEM_TIPOS
      .filter((t) => contagem[t])
      .map((t) => `<button class="fchip" data-tipo="${t}" aria-pressed="false">${escapeHtml(TIPOS[t].label)} · ${contagem[t]}</button>`),
  ].join('');

  const conteudo = `
${secao({
    bare: true,
    label: 'Busca',
    lead: '<b>Índice pré-construído no build.</b> A busca roda inteiramente no navegador, sem servidor e sem internet: o índice viaja junto com esta página.',
    corpo: `
<div class="searchbar">
  <input id="q" type="search" placeholder="Buscar por título, card, tag ou conteúdo…" autocomplete="off" aria-label="Buscar na documentação">
  <span class="hint" id="contador">${grafo.docs.length} resultados</span>
</div>
<div class="filters">${filtros}</div>
<div id="resultados" style="margin-top:22px"></div>`,
  })}
<script>window.DOCZILLA_INDICE = ${jsonSeguro(indice)};</script>
`;

  return pagina({ titulo: 'Busca', chave: 'busca', projeto, conteudo, livereload: projeto.livereload });
}

/** Evita que "</script>" dentro de um documento feche a tag do indice. */
function jsonSeguro(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/* ----------------------------------------------------------------
   Grafo
   ---------------------------------------------------------------- */

export function renderGrafo({ grafo, projeto }) {
  const cards = grafo.cards.slice(0, 6);
  // So entram as regras que alguem de fato referencia: regra solta no grafo
  // contradiz a legenda e nao acrescenta informacao de ligacao.
  const regras = grafo.docs.filter((d) => d.type === 'regra' && d.entradas.length);

  const conteudo = secao({
    bare: true,
    label: 'Mapa de ligações',
    lead: '<b>Linha cheia é ligação por card</b>, inferida automaticamente pelo campo <code>card</code>. <b>Linha tracejada é wikilink</b> escrito no texto. As regras de negócio ficam soltas embaixo: pertencem ao projeto, não a um card.',
    corpo: `<div class="graphbox">${svgGrafo(cards, regras, grafo)}</div>${legenda()}`,
  });

  return pagina({ titulo: 'Grafo', chave: 'grafo', projeto, conteudo, livereload: projeto.livereload });
}

function svgGrafo(cards, regras, grafo) {
  if (!cards.length) {
    return '<div class="vazio">Nenhum card para desenhar ainda.</div>';
  }

  const colunas = Math.min(cards.length, 3);
  const linhas = Math.ceil(cards.length / colunas);
  const largura = 900;
  const passoX = largura / colunas;
  const passoY = 250;
  const alturaCards = linhas * passoY;
  const yRegras = alturaCards + 60;
  const altura = yRegras + 110;

  const posCard = cards.map((card, i) => ({
    card,
    x: passoX * (i % colunas) + passoX / 2,
    y: passoY * Math.floor(i / colunas) + 130,
  }));

  const posRegra = regras.slice(0, 4).map((regra, i) => {
    const larguraCaixa = 176;
    const espaco = Math.min(largura / (regras.slice(0, 4).length + 1), 220);
    return {
      regra,
      x: espaco * (i + 1) - larguraCaixa / 2,
      y: yRegras,
      w: larguraCaixa,
    };
  });

  const arestasDoc = [];
  const nosDoc = [];

  for (const { card, x, y } of posCard) {
    const total = card.docs.length;
    card.docs.forEach((doc, i) => {
      // Distribui os documentos em arco ao redor do hub do card.
      const angulo = (-Math.PI * 0.78) + (Math.PI * 1.56) * (total === 1 ? 0.5 : i / (total - 1));
      const raio = 96;
      const dx = x + Math.cos(angulo) * raio;
      const dy = y + Math.sin(angulo) * raio;
      const token = TIPOS[doc.type]?.token ?? 'neutro';
      arestasDoc.push(`<path class="ed" d="M${x.toFixed(1)} ${y.toFixed(1)} L ${dx.toFixed(1)} ${dy.toFixed(1)}"/>`);
      nosDoc.push(`<a href="${doc.href}"><title>${escapeHtml(doc.title)}</title><rect x="${(dx - 14).toFixed(1)}" y="${(dy - 14).toFixed(1)}" width="28" height="28" rx="9" fill="var(--${token})"/></a>`);
    });
  }

  // Wikilinks que saem de um card e caem numa regra de negocio.
  const arestasRegra = [];
  for (const { card, x, y } of posCard) {
    for (const doc of card.docs) {
      for (const id of doc.saidas) {
        const alvo = grafo.doc(id);
        if (alvo?.type !== 'regra') continue;
        const destino = posRegra.find((p) => p.regra.id === alvo.id);
        if (!destino) continue;
        const cx = destino.x + destino.w / 2;
        arestasRegra.push(`<path class="ed-wl" d="M${x.toFixed(1)} ${y.toFixed(1)} C ${x.toFixed(1)} ${(y + 140).toFixed(1)}, ${cx.toFixed(1)} ${(destino.y - 110).toFixed(1)}, ${cx.toFixed(1)} ${destino.y.toFixed(1)}"/>`);
      }
    }
  }

  const hubs = posCard.map(({ card, x, y }) => `<a href="${card.href}"><title>${escapeHtml(card.title)}</title>
  <circle class="hub" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="40"/>
  <text class="cl" x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${escapeHtml(rotuloCurto(card.id))}</text>
</a>`).join('');

  const caixasRegra = posRegra.map(({ regra, x, y, w }) => `<a href="${regra.href}"><title>${escapeHtml(regra.title)}</title>
  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="40" rx="13" fill="none" stroke="var(--t-regra)" stroke-width="1.6"/>
  <text class="nl" x="${(x + w / 2).toFixed(1)}" y="${(y + 25).toFixed(1)}" text-anchor="middle" fill="var(--t-regra)">${escapeHtml(rotuloCurto(regra.id, 22))}</text>
</a>`).join('');

  const rodape = regras.length
    ? `<text class="nl" x="${largura / 2}" y="${yRegras + 78}" text-anchor="middle" fill="var(--text-mute)">regras de negócio · referenciadas por wikilink, sem dono</text>`
    : '';

  return `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Grafo com ${cards.length} cards, seus documentos e as regras de negócio referenciadas.">
${arestasDoc.join('\n')}
${arestasRegra.join('\n')}
${nosDoc.join('\n')}
${hubs}
${caixasRegra}
${rodape}
</svg>`;
}

function rotuloCurto(texto, limite = 10) {
  const limpo = String(texto);
  if (limpo.length <= limite) return limpo;
  // IDs como ORI-1487 ficam melhores cortados pelo numero final.
  const numero = limpo.match(/(\d+)\s*$/);
  if (numero) return numero[1];
  return `${limpo.slice(0, limite - 1)}…`;
}

function legenda() {
  const itens = ORDEM_TIPOS
    .map((t) => `<span class="leg" style="--c:var(--${TIPOS[t].token})"><i></i>${escapeHtml(TIPOS[t].label)}</span>`)
    .join('');
  return `<div class="legend">${itens}</div>`;
}

/* ----------------------------------------------------------------
   Mapa do projeto
   ---------------------------------------------------------------- */

/**
 * O que a pre-leitura entendeu deste projeto.
 *
 * So existe no regime descoberto, e e a tela que responde a pergunta de quem
 * chega num repositorio alheio: onde mora a documentacao, o que agrupa os
 * documentos, como eles se referenciam e quanto disso ja esta no padrao.
 * Se algo aqui estiver errado, o conserto e no `perfil` do config.
 */
export function renderMapa({ grafo, projeto, adocao }) {
  const { eixo } = grafo;
  const porRaiz = new Map();
  for (const doc of grafo.docs) {
    porRaiz.set(doc.raiz, (porRaiz.get(doc.raiz) ?? 0) + 1);
  }

  const linhasRaiz = (projeto.raizes ?? []).map((raiz) => `<tr>
  <td><code>${escapeHtml(raiz.rel)}/</code></td>
  <td>${escapeHtml(raiz.rotulo)}</td>
  <td>${porRaiz.get(raiz.rel) ?? 0}</td>
  <td>${raiz.tipoPadrao ? chipTipo(raiz.tipoPadrao) : '<span class="cm">—</span>'}</td>
  <td>${Number.isFinite(raiz.profundidade) ? `${raiz.profundidade} ${raiz.profundidade === 1 ? 'nível' : 'níveis'}` : 'toda a subárvore'}</td>
</tr>`).join('');

  const wikilinks = grafo.docs.reduce((s, d) => s + d.wikilinks.length, 0);
  const relativos = grafo.docs.reduce((s, d) => s + (d.relativos?.length ?? 0), 0);
  const arestas = grafo.docs.reduce((s, d) => s + d.saidas.length, 0);
  const soltos = grafo.docs.filter((d) => !d.saidas.length && !d.entradas.length).length;

  const comoEixo = {
    card: 'Cada documento declara a que card pertence, no campo <code>card</code> do frontmatter.',
    chave: `A marca <code>${escapeHtml(eixo.padrao)}</code> se repete no nome dos arquivos e no título, e é ela que reúne os documentos. Quem declara <code>card</code> no frontmatter continua mandando mais que a inferência.`,
    pasta: 'Nenhuma outra marca se repetia o bastante, então o agrupamento é a própria árvore de pastas — a divisão que a equipe já usa no editor.',
  }[eixo.modo];

  const conteudo = `
${secao({
    bare: true,
    label: 'Raízes lidas',
    lead: `<b>${(projeto.raizes ?? []).length} ${(projeto.raizes ?? []).length === 1 ? 'pasta declarada' : 'pastas declaradas'} no perfil do projeto.</b> O Doczilla só lê o que está aqui: nenhum arquivo entra na wiki sem que alguém tenha declarado a pasta dele.`,
    corpo: `<div class="tablewrap"><table>
  <thead><tr><th>Pasta</th><th>Rótulo</th><th>Documentos</th><th>Tipo padrão</th><th>Profundidade</th></tr></thead>
  <tbody>${linhasRaiz}</tbody>
</table></div>`,
  })}

${secao({
    label: 'Eixo de agrupamento',
    lead: `<b>Este projeto agrupa por ${escapeHtml(eixo.modo)}</b>, e por isso a wiki chama cada grupo de <b>${escapeHtml(eixo.rotulo.toLowerCase())}</b>. ${comoEixo}`,
    corpo: `<div class="figures">
  <div class="fig"><div class="fig-n">${grafo.cards.length}</div><div class="fig-l">${escapeHtml(eixo.rotuloPlural.toLowerCase())}</div></div>
  <div class="fig"><div class="fig-n">${grafo.docs.filter((d) => d.card).length}</div><div class="fig-l">com campo card</div></div>
  <div class="fig"><div class="fig-n">${grafo.qualificados?.length ?? 0}</div><div class="fig-l">nomes qualificados</div></div>
</div>`,
  })}

${secao({
    label: 'Ligações encontradas',
    lead: '<b>Toda ligação da wiki foi inferida, nenhuma foi escrita para ela.</b> Wikilink e link relativo viram a mesma aresta: os dois dizem que um documento fala do outro.',
    corpo: `<div class="figures">
  <div class="fig"><div class="fig-n">${arestas}</div><div class="fig-l">ligações no grafo</div></div>
  <div class="fig"><div class="fig-n">${wikilinks}</div><div class="fig-l">wikilinks</div></div>
  <div class="fig"><div class="fig-n">${relativos}</div><div class="fig-l">links relativos</div></div>
  <div class="fig"><div class="fig-n ${soltos ? 'w' : 'g'}">${soltos}</div><div class="fig-l">documentos sem ligação</div></div>
</div>`,
  })}

${secao({
    label: 'Progresso de adoção',
    lead: `<b>${adocao.noPadrao} de ${adocao.total} documentos já estão no padrão</b> — ${adocao.percentual}%. Os outros aparecem na wiki e na busca do mesmo jeito: adotar o padrão acrescenta trilha e validação, não é condição para entrar.`,
    corpo: `<div class="hlist">
  <div class="hrow"><span class="st ${adocao.percentual > 50 ? 'g' : 'warn'}">${adocao.percentual}%</span><span class="msg">documentos com <code>type</code> reconhecido pelo padrão</span><code>${adocao.noPadrao} de ${adocao.total}</code></div>
  ${contagemPorTipo(grafo)}
</div>`,
  })}

${secao({
    label: `Estrutura real de ${escapeHtml((projeto.raizes ?? []).map((r) => r.rel).join(', '))}`,
    lead: '<b>A árvore como está no disco</b>, na profundidade que o projeto usa. Nenhum arquivo foi movido: o Doczilla lê onde está.',
    corpo: `<pre class="tree">${arvoreReal(grafo, projeto)}</pre>`,
  })}
`;

  return pagina({ titulo: 'Mapa', chave: 'mapa', projeto, conteudo, livereload: projeto.livereload });
}

function contagemPorTipo(grafo) {
  const contagem = new Map();
  for (const doc of grafo.docs) {
    const chave = TIPOS[doc.type] ? doc.type : '';
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return [...ORDEM_TIPOS, '']
    .filter((t) => contagem.has(t))
    .map((t) => `<div class="hrow">
  <span class="st plain">${contagem.get(t)}</span>
  <span class="msg">${t ? escapeHtml(TIPOS[t].plural) : 'Sem tipo reconhecido — entram na busca, fora da trilha'}</span>
  <code>${t ? `type: ${t}` : ''}</code>
</div>`).join('');
}

/* ----------------------------------------------------------------
   Padrao
   ---------------------------------------------------------------- */

export function renderPadrao({ grafo, projeto }) {
  const invocacao = projeto.invocacao ?? 'node bin/doczilla.js';
  const rotuloEstrutura = projeto.raizes && projeto.raizes.length > 1
    ? 'Estrutura do projeto'
    : `Estrutura de ${projeto.dirDocs}/`;

  const conteudo = `
${secao({
    bare: true,
    label: rotuloEstrutura,
    lead: '<b>A pasta organiza para o olho humano; o frontmatter é o que o Doczilla lê.</b> Mover um arquivo de pasta não quebra a wiki: só muda onde ele aparece na árvore.',
    corpo: `<pre class="tree">${projeto.regime === 'descoberto' ? arvoreReal(grafo, projeto) : arvore(grafo, projeto)}</pre>
<div class="note">
  <span class="ic">i</span>
  <p><b>É o <code>DOCUMENTATION-GUIDE.md</code> que fecha o ciclo.</b> Ele é criado pelo <code>${invocacao} init</code> e traz o padrão em forma de instrução para a IA. Aponte seu <code>CLAUDE.md</code> para ele uma vez e toda documentação nasce no formato certo, sem ninguém precisar lembrar dos campos.</p>
</div>`,
  })}

${secao({
    label: 'Campos por tipo',
    lead: `<b>Quatro campos valem para todos</b> — ${CAMPOS_COMUNS.map((c) => `<code>${c}</code>`).join(', ')}. O resto muda conforme o tipo, e o build avisa quando falta algum.`,
    corpo: tabelaCampos(),
  })}

${secao({
    label: 'Comandos',
    lead: '<b>Roda copiado para dentro do projeto</b>, sem instalar nada e sem tocar em nenhuma pasta de código. Só devs rodam estes comandos — o resto do time lê o site já pronto.',
    corpo: `<div class="grid3">
  ${cardComando('init', 'var(--violet-lift)', `Cria <code>${projeto.dirDocs}/</code> com as pastas, o <code>DOCUMENTATION-GUIDE.md</code> e um exemplo de cada tipo. Roda uma vez por projeto.`, `${invocacao} init`)}
  ${cardComando('build', 'var(--green)', `Lê tudo, valida o padrão, resolve as ligações e escreve o site em <code>${projeto.dirSaida ?? `${projeto.dirDocs}/_site/`}</code>. Abre por duplo clique, offline.`, `${invocacao} build`)}
  ${cardComando('serve', 'var(--t-arq)', 'Sobe um servidor local com recarga automática enquanto você escreve. Só para quem está editando.', `${invocacao} serve`)}
</div>`,
  })}
`;

  return pagina({ titulo: 'Padrão', chave: 'padrao', projeto, conteudo, livereload: projeto.livereload });
}

function arvore(grafo, projeto) {
  const porPasta = new Map();
  for (const doc of grafo.docs) {
    const pasta = doc.pasta || '.';
    if (!porPasta.has(pasta)) porPasta.set(pasta, []);
    porPasta.get(pasta).push(doc);
  }

  const linhas = [`<span class="dir">${escapeHtml(projeto.dirDocs)}/</span>`];
  const pastas = [...porPasta.keys()].sort((a, b) => (a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b)));

  pastas.forEach((pasta) => {
    // Nenhuma pasta e a ultima na arvore: o _site/ e sempre acrescentado depois.
    const ultimaPasta = false;
    const docs = porPasta.get(pasta).slice().sort((a, b) => a.id.localeCompare(b.id));

    if (pasta === '.') {
      for (const doc of docs) {
        const destaque = /guide|padrao|readme/i.test(doc.id) ? 'hl' : '';
        linhas.push(`├── <span class="${destaque}">${escapeHtml(doc.relPath)}</span>`);
      }
      return;
    }

    const tipoDaPasta = Object.values(TIPOS).find((t) => t.dir === pasta);
    const comentario = tipoDaPasta ? `   <span class="cm"># type: ${chaveTipo(tipoDaPasta)}</span>` : '';
    linhas.push(`${ultimaPasta ? '└──' : '├──'} <span class="dir">${escapeHtml(pasta)}/</span>${comentario}`);

    const prefixo = ultimaPasta ? '    ' : '│   ';
    docs.forEach((doc, i) => {
      const galho = i === docs.length - 1 ? '└──' : '├──';
      linhas.push(`${prefixo}${galho} ${escapeHtml(doc.relPath.split('/').slice(1).join('/'))}`);
    });
  });

  linhas.push(`└── <span class="dir">_site/</span>                    <span class="cm"># saída do build (fica no .gitignore)</span>`);
  return linhas.join('\n');
}

function chaveTipo(tipo) {
  return Object.keys(TIPOS).find((k) => TIPOS[k] === tipo) ?? '';
}

/**
 * A arvore como ela e no disco, em qualquer profundidade e em qualquer numero
 * de raizes. E o que um projeto existente precisa ver: nao a estrutura que o
 * Doczilla propoe, mas a que a equipe ja construiu.
 */
function arvoreReal(grafo, projeto) {
  const raiz = { filhos: new Map(), docs: [] };

  for (const doc of grafo.docs) {
    let no = raiz;
    for (const segmento of doc.relPath.split('/').slice(0, -1)) {
      if (!no.filhos.has(segmento)) no.filhos.set(segmento, { filhos: new Map(), docs: [] });
      no = no.filhos.get(segmento);
    }
    no.docs.push(doc);
  }

  const linhas = [];
  desenharNo(raiz, '', linhas);
  linhas.push(`<span class="cm"># saída do build: ${escapeHtml(projeto.dirSaida ?? '_site/')}</span>`);
  return linhas.join('\n');
}

function desenharNo(no, prefixo, linhas) {
  const pastas = [...no.filhos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const docs = no.docs.slice().sort((a, b) => a.id.localeCompare(b.id));
  const itens = [
    ...pastas.map(([nome, filho]) => ({ tipo: 'pasta', nome, filho })),
    ...docs.map((doc) => ({ tipo: 'doc', doc })),
  ];

  itens.forEach((item, i) => {
    const ultimo = i === itens.length - 1;
    const galho = ultimo ? '└──' : '├──';

    if (item.tipo === 'doc') {
      const tipo = TIPOS[item.doc.type];
      const comentario = tipo
        ? `   <span class="cm"># ${escapeHtml(tipo.label.toLowerCase())}${item.doc.typeInferido ? ' (herdado da raiz)' : ''}</span>`
        : '';
      linhas.push(`${prefixo}${galho} ${escapeHtml(item.doc.relPath.split('/').pop())}${comentario}`);
      return;
    }

    const total = contarDocs(item.filho);
    linhas.push(`${prefixo}${galho} <span class="dir">${escapeHtml(item.nome)}/</span>   <span class="cm"># ${total} ${total === 1 ? 'documento' : 'documentos'}</span>`);
    desenharNo(item.filho, `${prefixo}${ultimo ? '    ' : '│   '}`, linhas);
  });
}

function contarDocs(no) {
  let total = no.docs.length;
  for (const filho of no.filhos.values()) total += contarDocs(filho);
  return total;
}

function tabelaCampos() {
  const linhas = ORDEM_TIPOS.map((t) => {
    const tipo = TIPOS[t];
    const proprios = tipo.obrigatorios.length
      ? tipo.obrigatorios.map((c) => `<code>${c}</code>`).join(', ')
      : '—';
    const opcionais = tipo.opcionais.map((c) => `<code>${c}</code>`).join(', ') || '—';
    return `<tr>
  <td>${chipTipo(t)}</td>
  <td>${proprios}</td>
  <td>${opcionais}</td>
  <td>${tipo.exigeCard ? 'Sim' : 'Não'}</td>
</tr>`;
  }).join('');

  return `<div class="tablewrap"><table>
  <thead><tr><th>Tipo</th><th>Campos próprios obrigatórios</th><th>Opcionais</th><th>Precisa de card?</th></tr></thead>
  <tbody>${linhas}</tbody>
</table></div>`;
}

function cardComando(nome, cor, descricao, comando) {
  return `<div class="tcard" style="--c:${cor}">
  <div class="tcard-top"><h3>${nome}</h3></div>
  <p>${descricao}</p>
  <span class="slug">${escapeHtml(comando)}</span>
</div>`;
}
