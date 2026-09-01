import { TIPOS, ORDEM_TIPOS, normalizar } from './schema.js';
import { slugify } from './markdown.js';

const EIXO_PADRAO = { modo: 'card', padrao: '', rotulo: 'Card', rotuloPlural: 'Cards' };

/**
 * Monta o grafo da wiki a partir dos documentos carregados.
 *
 * Sao tres naturezas de ligacao, e a distincao importa na leitura:
 *  - por grupo: inferida do eixo (o campo `card`, uma chave no nome do arquivo
 *    ou a pasta). Nao exige que ninguem escreva link.
 *  - por wikilink: escrita a mao no corpo, com [[nome-do-doc]].
 *  - por link relativo: [texto](../pasta/outro.md), que e como projeto que ja
 *    tinha documentacao antes do Doczilla liga um documento a outro.
 * Backlink e o inverso das duas ultimas: quem aponta para este documento.
 *
 * @param {Array} docs
 * @param {{eixo?: object, ligacoes?: object, regime?: 'padrao'|'descoberto'}} opcoes
 */
export function montarGrafo(docs, opcoes = {}) {
  const eixo = { ...EIXO_PADRAO, ...(opcoes.eixo ?? {}) };
  const ligacoes = { relativos: false, campos: [], ...(opcoes.ligacoes ?? {}) };
  const regime = opcoes.regime ?? 'padrao';

  const porId = new Map();
  const duplicados = [];
  const qualificados = [];

  for (const doc of docs) {
    let chave = chaveBusca(doc.id);
    if (porId.has(chave)) {
      const primeiro = porId.get(chave);
      if (regime === 'padrao') {
        // Comportamento historico: o segundo arquivo e ignorado e a duplicidade
        // vira aviso critico. Num projeto que nasceu com o padrao, dois
        // arquivos disputando o mesmo nome sao erro de quem escreveu.
        duplicados.push({ id: doc.id, primeiro: primeiro.relPath, segundo: doc.relPath });
        continue;
      }
      // Regime descoberto: repositorio real tem varios README.md, e descartar
      // documento e pior do que renomea-lo. O id ganha a pasta na frente.
      const novoId = idQualificado(doc, porId);
      qualificados.push({ de: doc.id, para: novoId, relPath: doc.relPath, colideCom: primeiro.relPath });
      doc.id = novoId;
      doc.slug = slugify(novoId);
      chave = chaveBusca(novoId);
    }
    doc.href = hrefDoc(doc);
    porId.set(chave, doc);
  }

  // Indices secundarios, para tolerar [[Titulo Escrito Por Extenso]] e
  // [[pasta/arquivo]], e para resolver link relativo pelo caminho no disco.
  const porTitulo = new Map();
  const porCaminho = new Map();
  const porAbs = new Map();
  for (const doc of porId.values()) {
    const titulo = chaveBusca(doc.title);
    if (!porTitulo.has(titulo)) porTitulo.set(titulo, doc);
    porCaminho.set(chaveCaminho(doc.relPath), doc);
    porAbs.set(chaveCaminho(doc.absPath), doc);
  }

  const resolver = (nome) => porId.get(chaveBusca(nome))
    ?? porTitulo.get(chaveBusca(nome))
    ?? porCaminho.get(chaveCaminho(nome))
    ?? null;

  // Sem `ligacoes.relativos`, link relativo continua saindo como o autor
  // escreveu: e o comportamento do regime padrao, onde a ligacao entre
  // documentos e o wikilink e mais nada.
  const resolverHrefDe = (doc) => (href) => (ligacoes.relativos
    ? resolverRelativo(doc, href, { porAbs, porCaminho, resolver })
    : null);

  for (const doc of porId.values()) {
    for (const nome of doc.wikilinks) {
      const alvo = resolver(nome);
      if (!alvo) {
        doc.quebrados.push(nome);
        continue;
      }
      ligar(doc, alvo);
    }

    if (ligacoes.relativos) {
      for (const href of doc.relativos ?? []) {
        const alvo = resolverHrefDe(doc)(href);
        if (!alvo) {
          // Link relativo pode apontar para fora das raizes lidas (um .md do
          // codigo, por exemplo). Isso nao e erro de documentacao: e observacao.
          doc.relativosQuebrados.push(href);
          continue;
        }
        ligar(doc, alvo);
      }
    }

    // `related:` no frontmatter conta como saida, mas nao gera aviso quando
    // aponta para nada: e um campo de intencao, nao de navegacao. Os campos
    // declarados em `perfil.ligacoes.campos` entram pela mesma porta, e e assim
    // que frontmatter de outro padrao (parent, epic) vira ligacao sem que
    // ninguem precise reescrever documento.
    const relacionados = [...doc.related];
    for (const campo of ligacoes.campos) {
      for (const nome of comoNomes(doc.data?.[campo])) relacionados.push(nome);
    }
    for (const nome of relacionados) {
      const alvo = resolver(nome);
      if (!alvo) continue;
      ligar(doc, alvo);
    }
  }

  const cards = montarCards([...porId.values()], eixo);

  return {
    docs: [...porId.values()],
    porId,
    cards,
    eixo,
    duplicados,
    qualificados,
    resolver,
    resolverHrefDe,
    doc: (id) => porId.get(chaveBusca(id)) ?? null,
  };
}

function ligar(origem, alvo) {
  if (alvo.id === origem.id) return;
  if (!origem.saidas.includes(alvo.id)) origem.saidas.push(alvo.id);
  if (!alvo.entradas.includes(origem.id)) alvo.entradas.push(origem.id);
}

/** Chave tolerante a caixa e acento, para casar [[Alcada Comercial]] com o arquivo. */
function chaveBusca(texto) {
  return slugify(normalizar(texto));
}

/** Caminho comparavel: sem extensao, sem caixa, sem acento e sem "./" na frente. */
function chaveCaminho(caminho) {
  return normalizar(String(caminho ?? '').replace(/\.md$/i, '')).replace(/^\.\//, '');
}

/**
 * Id de um homonimo: acrescenta pastas da direita para a esquerda ate ficar
 * unico. Um "README" em arquitetura/ vira "arquitetura/README".
 */
function idQualificado(doc, porId) {
  const segmentos = doc.segmentos ?? [];
  for (let i = segmentos.length - 1; i >= 0; i -= 1) {
    const candidato = [...segmentos.slice(i), doc.id].join('/');
    if (!porId.has(chaveBusca(candidato))) return candidato;
  }
  let n = 2;
  while (porId.has(chaveBusca(`${doc.id}-${n}`))) n += 1;
  return `${doc.id}-${n}`;
}

/**
 * Resolve [texto](../pasta/outro.md) para o documento apontado.
 *
 * Tenta o caminho real no disco primeiro, porque e o unico que acerta quando
 * origem e destino estao em raizes diferentes; depois o caminho relativo a
 * raiz; e por ultimo o nome do arquivo, que salva o link escrito com um "../"
 * a mais.
 */
export function resolverRelativo(doc, href, { porAbs, porCaminho, resolver }) {
  const alvo = String(href).split('#')[0].trim();
  if (!alvo) return null;

  const pelaAbsoluta = porAbs.get(chaveCaminho(juntarCaminho(doc.absPath, alvo)));
  if (pelaAbsoluta) return pelaAbsoluta;

  const pelaRelativa = porCaminho.get(chaveCaminho(juntarCaminho(doc.relPath, alvo)));
  if (pelaRelativa) return pelaRelativa;

  const nome = alvo.split('/').pop().replace(/\.md$/i, '');
  return resolver(nome);
}

/**
 * Normaliza "pasta/a.md" + "../b/c.md" sem depender de path: os caminhos aqui
 * usam sempre barra normal, inclusive no Windows, e path.posix.resolve
 * prefixaria o diretorio de trabalho num caminho que comeca com "C:".
 */
function juntarCaminho(base, relativo) {
  const partes = String(base).split('/').slice(0, -1);
  for (const parte of String(relativo).split('/')) {
    if (!parte || parte === '.') continue;
    if (parte === '..') partes.pop();
    else partes.push(parte);
  }
  return partes.join('/');
}

/** Valor de frontmatter alheio lido como lista de nomes. */
function comoNomes(valor) {
  if (valor == null) return [];
  if (Array.isArray(valor)) return valor.map((v) => String(v).trim()).filter(Boolean);
  return String(valor).split(',').map((v) => v.trim()).filter(Boolean);
}

export function hrefDoc(doc) {
  return `doc-${slugify(doc.id)}.html`;
}

export function hrefCard(cardId) {
  return `card-${slugify(cardId)}.html`;
}

/**
 * A chave que agrupa um documento, segundo o eixo do projeto.
 *  - card:  o campo `card` do frontmatter. E o padrao do Doczilla.
 *  - chave: uma marca repetida no nome do arquivo ou no titulo (ORI-1487,
 *           ADR-0012). E o eixo de quem usa ticket mas nao usa frontmatter.
 *  - pasta: a propria divisao de pastas do projeto. Sempre funciona, e por
 *           isso e o piso quando nenhum outro sinal existe.
 */
export function chaveDoEixo(doc, eixo) {
  if (!doc) return '';
  if (eixo.modo === 'pasta') return doc.card || doc.pastaCompleta || '';
  if (eixo.modo === 'chave') {
    // Frontmatter explicito ganha da inferencia: quem escreveu `card` decidiu.
    if (doc.card) return doc.card;
    const re = new RegExp(eixo.padrao);
    return (re.exec(doc.id) ?? re.exec(doc.title))?.[0] ?? '';
  }
  return doc.card;
}

function montarCards(docs, eixo) {
  const mapa = new Map();

  for (const doc of docs) {
    const bruto = chaveDoEixo(doc, eixo);
    if (!bruto) continue;
    const id = String(bruto).trim();
    const chave = chaveBusca(id);
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        id,
        href: hrefCard(id),
        docs: [],
        components: [],
        tags: [],
        regras: [],
      });
    }
    mapa.get(chave).docs.push(doc);
  }

  for (const card of mapa.values()) {
    // A trilha segue a ordem do padrao, nao a ordem alfabetica do disco.
    card.docs.sort((a, b) => ordemTipo(a.type) - ordemTipo(b.type) || a.id.localeCompare(b.id));

    // O titulo do card vem do entendimento: e o documento escrito na
    // linguagem do negocio, o mais legivel para quem nao e do time tecnico.
    const entendimento = card.docs.find((d) => d.type === 'entendimento');
    card.title = (entendimento ?? card.docs[0]).title;

    // O status do card e o do documento mais avancado na trilha.
    const ultimo = card.docs[card.docs.length - 1];
    card.status = ultimo?.status ?? '';
    card.updated = card.docs
      .map((d) => d.updated)
      .filter(Boolean)
      .sort()
      .pop() ?? '';
    card.sprint = card.docs.map((d) => d.sprint).find(Boolean) ?? '';

    for (const doc of card.docs) {
      for (const c of doc.components) if (!card.components.includes(c)) card.components.push(c);
      for (const t of doc.tags) if (!card.tags.includes(t)) card.tags.push(t);
    }

    card.tiposPresentes = new Set(card.docs.map((d) => d.type));
    // A trilha dos seis tipos so faz sentido quando o grupo e um card. Agrupado
    // por pasta, "falta a entrega" nao quer dizer nada.
    card.tiposFaltando = eixo.modo === 'card'
      ? ORDEM_TIPOS.filter((t) => TIPOS[t].exigeCard && !card.tiposPresentes.has(t))
      : [];
  }

  return [...mapa.values()].sort((a, b) => b.id.localeCompare(a.id, 'pt-BR', { numeric: true }));
}

function ordemTipo(type) {
  return TIPOS[type]?.order ?? 99;
}

/**
 * Regras de negocio referenciadas por um card, atravessando as saidas de
 * todos os seus documentos. E o unico caminho entre card e regra, ja que
 * regra nao tem campo `card`.
 */
export function regrasDoCard(card, grafo) {
  const encontradas = new Map();
  for (const doc of card.docs) {
    for (const id of doc.saidas) {
      const alvo = grafo.doc(id);
      if (alvo?.type === 'regra' && !encontradas.has(alvo.id)) encontradas.set(alvo.id, alvo);
    }
  }
  return [...encontradas.values()];
}

/** Cards que compartilham componente Salesforce ou ligacao com o card dado. */
export function cardsRelacionados(card, grafo) {
  const pontuacao = new Map();

  const somar = (outroId, motivo) => {
    if (!outroId || chaveBusca(outroId) === chaveBusca(card.id)) return;
    const atual = pontuacao.get(outroId) ?? { id: outroId, motivos: new Set() };
    atual.motivos.add(motivo);
    pontuacao.set(outroId, atual);
  };

  for (const outro of grafo.cards) {
    if (outro.id === card.id) continue;
    const compartilhados = outro.components.filter((c) => card.components.includes(c));
    if (compartilhados.length) somar(outro.id, `compartilha ${compartilhados[0]}`);
  }

  for (const doc of card.docs) {
    for (const id of [...doc.saidas, ...doc.entradas]) {
      const grupo = chaveDoEixo(grafo.doc(id), grafo.eixo);
      if (grupo) somar(String(grupo).trim(), 'citado na documentacao');
    }
  }

  return [...pontuacao.values()]
    .map((item) => ({
      card: grafo.cards.find((c) => c.id === item.id),
      motivo: [...item.motivos][0],
    }))
    .filter((item) => item.card)
    .slice(0, 6);
}
