import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { extrairWikilinks, extrairLinksRelativos } from './markdown.js';
import { TIPOS, normalizar } from './schema.js';

/**
 * A pre-leitura do projeto.
 *
 * Roda antes de existir qualquer configuracao, e responde a unica pergunta que
 * importa num repositorio que ja tinha documentacao: como esta gente organiza
 * o que escreve? Quais pastas guardam documentacao de verdade, o que agrupa os
 * documentos, e de que jeito eles se referenciam.
 *
 * O resultado e uma proposta de `perfil`, nunca uma decisao: quem confirma e
 * quem conhece o projeto. Nada aqui escreve documento; com --escrever, mexe
 * apenas no doczilla.config.json.
 */

/** Pastas que nunca guardam a documentacao de um projeto. */
export const IGNORADAS_REPO = new Set([
  'node_modules', '_site', 'dist', 'build', 'out', 'coverage', 'vendor',
  'target', 'bin', 'obj', 'tmp', 'temp', 'assets', 'img', 'imagens',
  // Metadata Salesforce: milhares de arquivos, nenhum deles documentacao.
  'force-app', 'sfdx-source', 'unpackaged', '.sfdx', '.sf',
]);

/** Arquivos que sao ruido de repositorio, nao documentacao. */
const RUIDO = new Set([
  'changelog', 'license', 'licence', 'contributing', 'code_of_conduct',
  'security', 'pull_request_template', 'issue_template', 'funding',
]);

/**
 * Nome de pasta que costuma indicar um tipo do padrao. Serve so para sugerir
 * `tipoPadrao` na proposta; o campo `type` do frontmatter sempre ganha.
 */
const SINONIMOS = {
  entendimento: ['cards', 'entendimentos', 'historias', 'stories', 'user-stories'],
  spec: ['specs', 'spec', 'especificacoes', 'requisitos', 'requirements', 'features'],
  arquitetura: ['arquitetura', 'architecture', 'adr', 'adrs', 'decisions', 'decisoes', 'design', 'rfcs'],
  bug: ['bugs', 'issues', 'incidentes', 'incidents', 'postmortems', 'defeitos'],
  entrega: ['entregas', 'releases', 'deploys', 'release-notes', 'versoes'],
  regra: ['regras', 'rules', 'policies', 'politicas', 'negocio', 'business'],
};

/** Marcas repetidas que costumam ser o eixo de um projeto. */
const CANDIDATOS_EIXO = [
  { nome: 'ticket', padrao: '[A-Z]{2,6}-\\d+', rotulo: 'Card', rotuloPlural: 'Cards' },
  { nome: 'adr', padrao: 'ADR-?\\d{2,4}', rotulo: 'Decisão', rotuloPlural: 'Decisões' },
  { nome: 'rfc', padrao: 'RFC-?\\d{2,4}', rotulo: 'RFC', rotuloPlural: 'RFCs' },
];

const COBERTURA_MINIMA = 0.4;

export async function analisar({ raiz = process.cwd(), profundidade = 8 } = {}) {
  const arquivos = await varrer(raiz, raiz, 0, profundidade);
  const docs = [];

  for (const rel of arquivos) {
    const raw = await readFile(path.join(raiz, rel), 'utf8');
    const { data, body, temFrontmatter } = parseFrontmatter(raw);
    const nome = rel.split('/').pop().replace(/\.md$/i, '');
    docs.push({
      rel,
      nome,
      pasta: rel.includes('/') ? rel.split('/').slice(0, -1).join('/') : '.',
      temFrontmatter,
      campos: Object.keys(data),
      type: normalizar(data.type),
      card: String(data.card ?? '').trim(),
      title: String(data.title ?? '').trim() || nome,
      wikilinks: extrairWikilinks(body).length,
      relativos: extrairLinksRelativos(body).length,
      ruido: RUIDO.has(normalizar(nome)),
    });
  }

  const pastas = agruparPorPasta(docs);
  const eixo = detectarEixo(docs);
  const ligacoes = detectarLigacoes(docs);
  const raizes = proporRaizes(pastas);

  return {
    raiz,
    total: docs.length,
    docs,
    pastas,
    eixo,
    ligacoes,
    perfil: {
      versao: 1,
      raizes,
      eixo,
      ligacoes,
      ignorar: [],
    },
  };
}

async function varrer(dir, raiz, nivel, limite) {
  if (nivel > limite) return [];
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
    if (entrada.isDirectory()) {
      if (IGNORADAS_REPO.has(normalizar(entrada.name))) continue;
      encontrados.push(...await varrer(abs, raiz, nivel + 1, limite));
      continue;
    }
    if (!entrada.name.toLowerCase().endsWith('.md')) continue;
    encontrados.push(path.relative(raiz, abs).split(path.sep).join('/'));
  }

  return encontrados;
}

function agruparPorPasta(docs) {
  const mapa = new Map();

  for (const doc of docs) {
    if (!mapa.has(doc.pasta)) {
      mapa.set(doc.pasta, {
        caminho: doc.pasta,
        total: 0,
        comFrontmatter: 0,
        comTipoValido: 0,
        wikilinks: 0,
        relativos: 0,
        ruido: 0,
        campos: new Map(),
      });
    }
    const p = mapa.get(doc.pasta);
    p.total += 1;
    if (doc.temFrontmatter) p.comFrontmatter += 1;
    if (doc.type && TIPOS[doc.type]) p.comTipoValido += 1;
    p.wikilinks += doc.wikilinks;
    p.relativos += doc.relativos;
    if (doc.ruido) p.ruido += 1;
    for (const campo of doc.campos) p.campos.set(campo, (p.campos.get(campo) ?? 0) + 1);
  }

  for (const p of mapa.values()) {
    p.nome = p.caminho === '.' ? '.' : p.caminho.split('/').pop();
    p.tipoSugerido = tipoDaPasta(p.nome);
    p.percentualFrontmatter = p.total ? Math.round((p.comFrontmatter / p.total) * 100) : 0;
    p.camposComuns = [...p.campos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([campo, n]) => ({ campo, n }));
    delete p.campos;
  }

  return [...mapa.values()].sort((a, b) => a.caminho.localeCompare(b.caminho));
}

export function tipoDaPasta(nome) {
  const alvo = normalizar(nome);
  for (const [type, nomes] of Object.entries(SINONIMOS)) {
    if (nomes.includes(alvo)) return type;
  }
  return '';
}

/**
 * O eixo do projeto, na ordem de confianca:
 *  1. o campo `card`, quando uma parte relevante dos documentos ja o declara;
 *  2. uma marca repetida no nome ou no titulo (ORI-1487, ADR-0007);
 *  3. a pasta, que sempre existe e por isso nunca deixa o projeto sem eixo.
 */
export function detectarEixo(docs) {
  if (!docs.length) return { modo: 'pasta', padrao: '', rotulo: 'Pasta', rotuloPlural: 'Pastas', cobertura: 0 };

  const comCard = docs.filter((d) => d.card).length / docs.length;
  if (comCard >= COBERTURA_MINIMA) {
    return {
      modo: 'card', padrao: '', rotulo: 'Card', rotuloPlural: 'Cards', cobertura: Math.round(comCard * 100),
    };
  }

  let melhor = null;
  for (const candidato of CANDIDATOS_EIXO) {
    const re = new RegExp(candidato.padrao);
    const casam = docs.filter((d) => re.test(d.nome) || re.test(d.title)).length;
    const cobertura = casam / docs.length;
    if (!melhor || cobertura > melhor.cobertura) melhor = { ...candidato, cobertura };
  }

  if (melhor && melhor.cobertura >= COBERTURA_MINIMA) {
    return {
      modo: 'chave',
      padrao: melhor.padrao,
      rotulo: melhor.rotulo,
      rotuloPlural: melhor.rotuloPlural,
      cobertura: Math.round(melhor.cobertura * 100),
    };
  }

  return {
    modo: 'pasta',
    padrao: '',
    rotulo: 'Pasta',
    rotuloPlural: 'Pastas',
    cobertura: 100,
    // Guardado para o relatorio poder dizer "o melhor palpite ficou em 18%".
    descartado: melhor ? { ...melhor, cobertura: Math.round(melhor.cobertura * 100) } : null,
  };
}

/** Campos de frontmatter alheios que valem ler como ligacao. */
const CAMPOS_LIGACAO = ['parent', 'epic', 'related', 'relacionados', 'depends_on', 'ver_tambem'];

export function detectarLigacoes(docs) {
  const campos = new Set();
  for (const doc of docs) {
    for (const campo of doc.campos) {
      if (CAMPOS_LIGACAO.includes(normalizar(campo))) campos.add(campo);
    }
  }
  const relativos = docs.reduce((s, d) => s + d.relativos, 0);
  const wikilinks = docs.reduce((s, d) => s + d.wikilinks, 0);
  return { relativos: relativos > 0 || wikilinks === 0, campos: [...campos] };
}

/**
 * As raizes propostas sao as pastas mais rasas que contem documentacao.
 * Pasta que so tem ruido de repositorio (CHANGELOG, LICENSE) fica de fora, e a
 * raiz do repositorio, quando entra, entra com profundidade 1: sem isso ela
 * arrastaria o projeto inteiro para dentro da wiki.
 */
export function proporRaizes(pastas) {
  const uteis = pastas.filter((p) => p.total > p.ruido);
  const raizes = [];

  for (const pasta of uteis) {
    if (pasta.caminho === '.') {
      raizes.push({ caminho: '.', rotulo: 'Raiz do projeto', profundidade: 1 });
      continue;
    }
    const topo = pasta.caminho.split('/')[0];
    if (raizes.some((r) => r.caminho === topo)) continue;
    const dono = uteis.find((p) => p.caminho === topo) ?? pasta;
    raizes.push({
      caminho: topo,
      rotulo: rotuloDePasta(topo),
      ...(dono.tipoSugerido ? { tipoPadrao: dono.tipoSugerido } : {}),
    });
  }

  return raizes.length ? raizes : [{ caminho: 'docs', rotulo: 'Documentação' }];
}

function rotuloDePasta(nome) {
  const tipo = tipoDaPasta(nome);
  if (tipo) return TIPOS[tipo].plural;
  return nome.charAt(0).toUpperCase() + nome.slice(1).replace(/[-_]+/g, ' ');
}

/**
 * Grava o perfil no doczilla.config.json preservando o resto do arquivo.
 * O config e do projeto, nao da ferramenta: chave que a gente nao conhece
 * continua onde estava.
 */
export async function escreverPerfil(raiz, perfil) {
  const caminho = path.join(raiz, 'doczilla.config.json');
  let atual = {};
  try {
    atual = JSON.parse(await readFile(caminho, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`doczilla.config.json invalido: ${err.message}`);
  }

  const novo = { ...atual, perfil };
  await writeFile(caminho, `${JSON.stringify(novo, null, 2)}\n`, 'utf8');
  return caminho;
}
