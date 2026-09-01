/**
 * O padrao de documentacao do Doczilla.
 *
 * Os tipos sao fixos de proposito: e o que garante que a instrucao dada a IA
 * vale igual em qualquer projeto. O doczilla.config.json so mexe em cosmetica
 * (nome do projeto, ordem das secoes), nunca nos campos.
 */

/** Campos exigidos de todo documento, independente do tipo. */
export const CAMPOS_COMUNS = ['type', 'title', 'status', 'updated'];

/**
 * order = posicao do documento na trilha de um card. O card e uma historia
 * contada em ordem: primeiro se entende, depois se especifica, decide, corrige
 * e entrega.
 */
export const TIPOS = {
  entendimento: {
    label: 'Entendimento',
    plural: 'Entendimentos',
    dir: 'cards',
    token: 't-entend',
    order: 1,
    exigeCard: true,
    obrigatorios: ['card'],
    opcionais: ['tags', 'sprint', 'related'],
    resumo: 'O que o card pede, na linguagem do negócio. Escrito antes de qualquer linha de código.',
  },
  spec: {
    label: 'Spec',
    plural: 'Specs',
    dir: 'specs',
    token: 't-spec',
    order: 2,
    exigeCard: true,
    obrigatorios: ['card'],
    opcionais: ['tags', 'reviewer', 'related'],
    resumo: 'Comportamento esperado, critérios de aceite e casos de borda. É o contrato do que será entregue.',
  },
  arquitetura: {
    label: 'Arquitetura',
    plural: 'Arquitetura',
    dir: 'arquitetura',
    token: 't-arq',
    order: 3,
    exigeCard: true,
    obrigatorios: ['card', 'components'],
    opcionais: ['tags', 'related'],
    resumo: 'Decisão técnica e o porquê dela. Objetos, automações e integrações tocadas.',
  },
  bug: {
    label: 'Investigação de bug',
    plural: 'Investigações de bug',
    dir: 'bugs',
    token: 't-bug',
    order: 4,
    exigeCard: true,
    obrigatorios: ['card', 'severity'],
    opcionais: ['tags', 'components', 'related'],
    resumo: 'Sintoma, causa raiz e correção. Fica no ar mesmo depois de resolvido: é memória do time.',
  },
  entrega: {
    label: 'Entrega',
    plural: 'Entregas',
    dir: 'entregas',
    token: 't-entrega',
    order: 5,
    exigeCard: true,
    obrigatorios: ['card', 'components', 'deployed'],
    opcionais: ['tags', 'rollback', 'related'],
    resumo: 'O que foi de fato desenvolvido, em quais componentes, e como validar em produção.',
  },
  regra: {
    label: 'Regra de negócio',
    plural: 'Regras de negócio',
    dir: 'regras',
    token: 't-regra',
    order: 6,
    exigeCard: false,
    obrigatorios: [],
    opcionais: ['tags', 'related'],
    resumo: 'Regra que atravessa vários cards. Não pertence a nenhum: é referenciada por todos.',
  },
};

/** Ordem canonica dos tipos para listagens e legendas. */
export const ORDEM_TIPOS = Object.keys(TIPOS).sort((a, b) => TIPOS[a].order - TIPOS[b].order);

/**
 * O status e texto livre (cada cliente tem seu vocabulario), mas mapeamos os
 * termos conhecidos para um tom visual. Termo desconhecido cai em neutro sem
 * gerar aviso: nao e papel da ferramenta policiar vocabulario.
 */
const TONS = {
  ok: [
    'aprovada', 'aprovado', 'resolvido', 'resolvida', 'entregue', 'concluido',
    'concluida', 'em producao', 'vigente', 'decidida', 'decidido', 'validado',
  ],
  warn: [
    'rascunho', 'em analise', 'em andamento', 'pendente', 'em revisao',
    'proposta', 'backlog', 'aguardando',
  ],
  crit: ['bloqueado', 'bloqueada', 'obsoleto', 'obsoleta', 'cancelado', 'cancelada'],
};

/** Normaliza acentos e caixa para comparar status de forma tolerante. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function tomDoStatus(status) {
  const alvo = normalizar(status);
  if (!alvo) return 'neutro';
  for (const [tom, termos] of Object.entries(TONS)) {
    if (termos.includes(alvo)) return tom;
  }
  return 'neutro';
}

export function tipoValido(type) {
  return Object.hasOwn(TIPOS, normalizar(type));
}

/** Campos obrigatorios de um tipo, ja somados aos comuns. */
export function camposObrigatorios(type) {
  const tipo = TIPOS[normalizar(type)];
  if (!tipo) return [...CAMPOS_COMUNS];
  return [...CAMPOS_COMUNS, ...tipo.obrigatorios];
}
