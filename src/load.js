import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter, comoLista } from './frontmatter.js';
import { extrairWikilinks, extrairLinksRelativos, textoPuro, slugify } from './markdown.js';
import { normalizar } from './schema.js';

/** Pastas dentro de uma raiz que nunca sao lidas como documentacao. */
const IGNORADAS = new Set(['_site', 'node_modules', '.git', 'assets', 'img', 'imagens']);

/**
 * Le recursivamente as raizes de documentacao e devolve um documento por
 * arquivo .md encontrado. Nada e descartado aqui: arquivo sem frontmatter ou
 * com tipo desconhecido tambem vira documento, para que a validacao possa
 * reclamar dele depois.
 *
 * Com uma raiz so, o relPath continua relativo a ela ("specs/x.md"), como
 * sempre foi. Com mais de uma, ele ganha o nome da raiz na frente
 * ("adr/0001-x.md"): sem isso dois arquivos de raizes diferentes teriam o
 * mesmo caminho na tela e no aviso.
 *
 * @param {Array<{abs: string, rel: string, tipoPadrao?: string}>|string} raizes
 */
export async function carregarDocumentos(raizes, opcoes = {}) {
  const lista = normalizarRaizes(raizes);
  const prefixar = lista.length > 1;
  const ignorar = (opcoes.ignorar ?? []).map((i) => normalizar(i));
  const dirSaida = opcoes.dirSaida ? path.resolve(opcoes.dirSaida) : null;
  const docs = [];
  const vistos = new Set();

  for (const raiz of lista) {
    const arquivos = await listarMarkdown(raiz.abs, raiz.abs, { ignorar, dirSaida, nivel: 0, limite: raiz.profundidade });

    for (const relInterno of arquivos.sort()) {
      const absPath = path.join(raiz.abs, relInterno);
      // Raizes aninhadas (docs/ e docs/adr/) leriam o mesmo arquivo duas vezes.
      if (vistos.has(absPath)) continue;
      vistos.add(absPath);

      const relPath = prefixar && raiz.rel !== '.' ? `${raiz.rel}/${relInterno}` : relInterno;
      const raw = await readFile(absPath, 'utf8');
      docs.push(montarDocumento(relPath, raw, { absPath, raiz: raiz.rel, tipoPadrao: raiz.tipoPadrao }));
    }
  }

  return docs;
}

function normalizarRaizes(raizes) {
  if (typeof raizes === 'string') return [{ abs: raizes, rel: '.', tipoPadrao: '', profundidade: Infinity }];
  return raizes.map((r) => ({
    abs: r.abs,
    rel: r.rel ?? '.',
    tipoPadrao: r.tipoPadrao ?? '',
    profundidade: Number.isFinite(r.profundidade) ? r.profundidade : Infinity,
  }));
}

async function listarMarkdown(dir, raiz, { ignorar, dirSaida, nivel, limite }) {
  const encontrados = [];
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch {
    return encontrados;
  }

  for (const entrada of entradas) {
    if (entrada.name.startsWith('.')) continue;
    const abs = path.join(dir, entrada.name);
    const rel = path.relative(raiz, abs).split(path.sep).join('/');
    if (ignorado(entrada.name, rel, ignorar)) continue;

    if (entrada.isDirectory()) {
      if (IGNORADAS.has(entrada.name.toLowerCase())) continue;
      // A saida do build pode morar em qualquer lugar via `saida:` na config;
      // le-la de volta faria o site virar documentacao de si mesmo.
      if (dirSaida && path.resolve(abs) === dirSaida) continue;
      // `profundidade` conta niveis de arquivo: 1 e so o que esta direto na
      // raiz. E assim que a raiz do repositorio pega o README de cima sem
      // varrer o projeto inteiro atras de .md.
      if (nivel + 1 >= limite) continue;
      encontrados.push(...await listarMarkdown(abs, raiz, { ignorar, dirSaida, nivel: nivel + 1, limite }));
      continue;
    }
    // So arquivo comum. Um link simbolico chamado "notas.md" apontando para
    // fora do projeto seria lido e publicado na wiki como se fosse documento.
    if (!entrada.isFile()) continue;
    if (!entrada.name.toLowerCase().endsWith('.md')) continue;
    encontrados.push(rel);
  }

  return encontrados;
}

/** Item de `perfil.ignorar`: casa por nome exato ou por prefixo do caminho. */
function ignorado(nome, rel, ignorar) {
  if (!ignorar.length) return false;
  const alvoNome = normalizar(nome);
  const alvoRel = normalizar(rel);
  return ignorar.some((padrao) => alvoNome === padrao
    || alvoRel === padrao
    || alvoRel.startsWith(`${padrao}/`));
}

export function montarDocumento(relPath, raw, opcoes = {}) {
  const { data, body, temFrontmatter } = parseFrontmatter(raw);
  const nomeArquivo = relPath.split('/').pop().replace(/\.md$/i, '');
  const texto = textoPuro(body);
  const segmentos = relPath.split('/').slice(0, -1);

  // Sem `type` no frontmatter, a raiz pode emprestar o dela: e como um projeto
  // que ja guardava todas as decisoes em adr/ entra na wiki sem reescrever
  // arquivo nenhum. Fica marcado como inferido para a validacao saber a origem.
  const typeDeclarado = normalizar(data.type);
  const typeHerdado = !typeDeclarado && opcoes.tipoPadrao ? normalizar(opcoes.tipoPadrao) : '';

  return {
    // O id vem do nome do arquivo: e o que a IA escreve dentro de [[...]].
    id: nomeArquivo,
    slug: slugify(nomeArquivo),
    relPath,
    // Caminho real no disco: e por ele que link relativo entre documentos
    // resolve, inclusive quando a origem e o destino estao em raizes diferentes.
    absPath: (opcoes.absPath ?? relPath).split(path.sep).join('/'),
    raiz: opcoes.raiz ?? '',
    segmentos,
    pasta: segmentos[0] ?? '',
    pastaCompleta: segmentos.join('/'),
    temFrontmatter,
    type: typeDeclarado || typeHerdado,
    typeInferido: Boolean(typeHerdado),
    typeCru: data.type ?? '',
    title: (data.title ?? '').toString().trim() || nomeArquivo,
    card: (data.card ?? '').toString().trim(),
    status: (data.status ?? '').toString().trim(),
    updated: (data.updated ?? '').toString().trim(),
    severity: (data.severity ?? '').toString().trim(),
    deployed: (data.deployed ?? '').toString().trim(),
    sprint: (data.sprint ?? '').toString().trim(),
    reviewer: (data.reviewer ?? '').toString().trim(),
    rollback: (data.rollback ?? '').toString().trim(),
    tags: comoLista(data.tags),
    components: comoLista(data.components),
    related: comoLista(data.related),
    data,
    body,
    texto,
    excerto: texto.slice(0, 260),
    wikilinks: extrairWikilinks(body),
    // Links [texto](../outro.md) escritos a mao: sao a ligacao que projeto
    // existente ja tem, e viram aresta igual ao wikilink no graph.js.
    relativos: extrairLinksRelativos(body),
    // Preenchidos pelo grafo.
    saidas: [],
    entradas: [],
    quebrados: [],
    relativosQuebrados: [],
    href: '',
  };
}
