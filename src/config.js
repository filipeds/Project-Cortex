import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Configuracao opcional do projeto (doczilla.config.json na raiz).
 *
 * Duas leituras convivem aqui, e a diferenca entre elas e o regime:
 *  - sem `perfil`: regime "padrao". Uma pasta docs/, o eixo e o campo `card`,
 *    e a validacao cobra o padrao inteiro. E o projeto que nasceu com o
 *    Doczilla, e o caminho de codigo e o mesmo de sempre.
 *  - com `perfil`: regime "descoberto". O projeto ja tinha documentacao antes,
 *    e o perfil (escrito por `doczilla analisar` e revisado por gente) diz
 *    quais pastas ler, como agrupar e o que conta como ligacao.
 *
 * O perfil nunca inventa tipo nem campo obrigatorio: isso continua vindo de
 * schema.js e vale igual em todo projeto. Ele so descreve a organizacao que
 * ja existe no repositorio.
 */
const PADRAO = {
  nome: '',
  plataforma: '',
  docs: 'docs',
  saida: '',
  perfil: null,
};

const MODOS_EIXO = new Set(['card', 'chave', 'pasta']);

export async function carregarConfig(raiz) {
  const caminho = path.join(raiz, 'doczilla.config.json');
  let arquivo = {};

  try {
    arquivo = JSON.parse(await readFile(caminho, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`doczilla.config.json invalido: ${err.message}`);
    }
  }

  const config = { ...PADRAO, ...arquivo };
  const perfil = normalizarPerfil(config.perfil);
  const raizes = montarRaizes(raiz, config, perfil);
  const dirDocs = raizes[0].abs;

  return {
    ...config,
    perfil,
    regime: perfil ? 'descoberto' : 'padrao',
    raizes,
    eixo: perfil?.eixo ?? eixoPadrao(),
    ligacoes: perfil?.ligacoes ?? ligacoesPadrao(),
    // Sem nome configurado, usamos o nome da pasta do projeto. Funciona bem
    // porque repositorio Salesforce quase sempre tem o nome do cliente.
    nome: config.nome || path.basename(raiz),
    // Primeira raiz: e onde o init escreve e o que o serve observa primeiro.
    dirDocs,
    dirSaida: config.saida ? path.resolve(raiz, config.saida) : path.join(dirDocs, '_site'),
    // Nome relativo, usado nos textos da wiki ("leu 47 arquivos em docs/").
    rotuloDocs: raizes[0].rel,
  };
}

/** Uma raiz quando nao ha perfil; as declaradas no perfil quando ha. */
function montarRaizes(raiz, config, perfil) {
  const declaradas = perfil?.raizes?.length
    ? perfil.raizes
    : [{ caminho: config.docs, rotulo: '', tipoPadrao: '' }];

  return declaradas.map((entrada) => {
    const rel = String(entrada.caminho).replace(/[\\/]+$/, '').split(path.sep).join('/');
    return {
      abs: path.resolve(raiz, entrada.caminho),
      rel: rel || '.',
      rotulo: entrada.rotulo || rel || '.',
      tipoPadrao: entrada.tipoPadrao || '',
      // A raiz do repositorio entra com profundidade 1 para pegar o README de
      // cima sem arrastar o projeto inteiro junto. Sem limite nas demais.
      profundidade: Number.isFinite(entrada.profundidade) ? entrada.profundidade : Infinity,
    };
  });
}

function eixoPadrao() {
  return { modo: 'card', padrao: '', rotulo: 'Card', rotuloPlural: 'Cards' };
}

function ligacoesPadrao() {
  return { relativos: false, campos: [] };
}

/**
 * Normaliza o bloco `perfil`, ou devolve null quando ele nao existe.
 * Erro de perfil e erro de configuracao: lanca, para nao gerar site em cima
 * de uma leitura que o autor nao pediu.
 */
export function normalizarPerfil(bruto) {
  if (bruto == null) return null;
  if (typeof bruto !== 'object' || Array.isArray(bruto)) {
    throw new Error('doczilla.config.json invalido: "perfil" precisa ser um objeto.');
  }

  const raizes = (Array.isArray(bruto.raizes) ? bruto.raizes : [])
    .map((entrada) => (typeof entrada === 'string' ? { caminho: entrada } : entrada))
    .filter((entrada) => entrada && entrada.caminho);

  if (!raizes.length) {
    throw new Error('doczilla.config.json invalido: "perfil.raizes" precisa listar ao menos uma pasta.');
  }

  const eixo = { ...eixoPadrao(), ...(bruto.eixo ?? {}) };
  if (!MODOS_EIXO.has(eixo.modo)) {
    throw new Error(
      `doczilla.config.json invalido: "perfil.eixo.modo" e "${eixo.modo}". Use ${[...MODOS_EIXO].join(', ')}.`,
    );
  }
  if (eixo.modo === 'chave') {
    if (!eixo.padrao) {
      throw new Error('doczilla.config.json invalido: "perfil.eixo.modo" e "chave", mas falta "perfil.eixo.padrao".');
    }
    try {
      // Compila uma vez aqui para que regex torto falhe na leitura da config,
      // e nao no meio do build com mensagem de outro lugar.
      RegExp(eixo.padrao);
    } catch (err) {
      throw new Error(`doczilla.config.json invalido: "perfil.eixo.padrao" nao e uma expressao regular: ${err.message}`);
    }
  }
  if (!eixo.rotuloPlural) eixo.rotuloPlural = `${eixo.rotulo}s`;

  const ligacoes = {
    relativos: bruto.ligacoes?.relativos !== false,
    campos: (bruto.ligacoes?.campos ?? []).map((c) => String(c).trim()).filter(Boolean),
  };

  return {
    versao: bruto.versao ?? 1,
    raizes,
    eixo,
    ligacoes,
    ignorar: (bruto.ignorar ?? []).map((i) => String(i).trim()).filter(Boolean),
  };
}
