import { TIPOS, ORDEM_TIPOS, camposObrigatorios, tipoValido } from './schema.js';

/**
 * Valida o padrao e devolve avisos.
 *
 * Nada aqui interrompe o build de proposito. Um campo esquecido nao pode
 * deixar o time inteiro sem wiki: o site sai, o problema aparece na tela de
 * saude, e quem escreveu corrige quando puder. Use --strict no CI para
 * transformar esses avisos em falha.
 *
 * A severidade depende do regime, e a diferenca e de intencao:
 *  - padrao: o projeto nasceu com o Doczilla, entao documento fora do padrao e
 *    erro de quem escreveu, e vira critico.
 *  - descoberto: o projeto ja tinha documentacao antes. Cobrar frontmatter de
 *    cada arquivo legado transformaria a tela de saude num muro de vermelho
 *    que ninguem le. Vira uma observacao agregada: "137 ainda fora do padrao".
 */

export const NIVEIS = { crit: 3, warn: 2, info: 1 };

export function validar(grafo, opcoes = {}) {
  const regime = opcoes.regime ?? 'padrao';
  const descoberto = regime === 'descoberto';
  const eixo = grafo.eixo ?? { modo: 'card' };
  const avisos = [];

  const add = (nivel, categoria, mensagem, onde, alvos) => {
    avisos.push({ nivel, categoria, mensagem, onde, ...(alvos ? { alvos } : {}) });
  };

  /** Um aviso para o conjunto, em vez de um por arquivo. */
  const agregar = (nivel, categoria, mensagem, alvos) => {
    if (!alvos.length) return;
    const amostra = alvos.slice(0, 3).join(' · ');
    const resto = alvos.length > 3 ? ` · e mais ${alvos.length - 3}` : '';
    add(nivel, categoria, mensagem(alvos.length), `${amostra}${resto}`, alvos);
  };

  for (const { id, primeiro, segundo } of grafo.duplicados) {
    add('crit', 'duplicidade',
      `Dois arquivos disputam o nome <b>${id}</b>. O segundo foi ignorado, e wikilinks para ele vão para o primeiro.`,
      `${primeiro} · ${segundo}`);
  }

  // Homonimos resolvidos por qualificacao: nenhum documento se perdeu, mas
  // quem escrever [[README]] vai cair no primeiro. Vale dizer, sem alarme.
  agregar('info', 'duplicidade',
    (n) => `<b>${n} ${n === 1 ? 'arquivo teve' : 'arquivos tiveram'} o nome qualificado pela pasta</b> por disputar o nome com outro documento. Nenhum foi descartado; use o nome completo no wikilink para apontar para o certo.`,
    (grafo.qualificados ?? []).map((q) => `${q.relPath} → ${q.para}`));

  const semFrontmatter = [];
  const semTipo = [];
  const tipoDesconhecido = [];

  for (const doc of grafo.docs) {
    if (!doc.temFrontmatter) {
      if (!descoberto) {
        // No regime padrao o arquivo para por aqui: sem frontmatter nao ha o
        // que validar depois. No descoberto ele segue, porque as ligacoes do
        // corpo continuam valendo mesmo sem metadado nenhum.
        add('crit', 'frontmatter',
          'Arquivo sem bloco de frontmatter. Sem ele o documento não tem tipo nem card, e fica solto na wiki.',
          doc.relPath);
        continue;
      }
      semFrontmatter.push(doc.relPath);
    }

    // Tudo que depende de metadado so vale para quem tem metadado. As ligacoes
    // do corpo, mais abaixo, valem para todo documento.
    if (doc.temFrontmatter) {
      if (!doc.type) {
        if (descoberto) semTipo.push(doc.relPath);
        else add('crit', 'frontmatter', 'Campo <b>type</b> ausente.', doc.relPath);
      } else if (!tipoValido(doc.type)) {
        if (descoberto) {
          tipoDesconhecido.push(doc.relPath);
        } else {
          const conhecidos = ORDEM_TIPOS.join(', ');
          add('crit', 'frontmatter',
            `Tipo <b>${doc.typeCru}</b> não existe no padrão. Use um destes: ${conhecidos}.`,
            doc.relPath);
        }
      }

      // Campo obrigatorio so e cobrado de quem se declarou daquele tipo. Tipo
      // herdado da raiz e palpite da ferramenta, e ninguem deve levar bronca
      // por um palpite que a propria ferramenta deu.
      const cobravel = !descoberto || (doc.type && !doc.typeInferido);
      const faltando = cobravel
        ? camposObrigatorios(doc.type)
          .filter((campo) => campo !== 'type')
          // Fora do eixo `card`, o agrupamento nao vem do frontmatter: cobrar o
          // campo seria pedir que o projeto adotasse um eixo que ele nao usa.
          .filter((campo) => campo !== 'card' || eixo.modo === 'card')
          .filter((campo) => vazio(doc[campo]))
        : [];

      for (const campo of faltando) {
        const extra = campo === 'card'
          ? ' O documento não vai aparecer em nenhuma página de card.'
          : '';
        add('warn', 'frontmatter', `Campo <b>${campo}</b> ausente.${extra}`, doc.relPath);
      }

      if (doc.type === 'regra' && doc.card) {
        add('warn', 'frontmatter',
          'Regra de negócio com campo <b>card</b>. Regra atravessa vários cards por definição: se ela pertence a um só, provavelmente é uma spec.',
          doc.relPath);
      }
    }

    // Wikilink e sempre critico: alguem escreveu [[algo]] esperando chegar
    // a um documento, e nao chega. Isso independe de regime.
    for (const nome of doc.quebrados) {
      add('crit', 'ligacao',
        `Wikilink quebrado: <b>[[${nome}]]</b> não corresponde a nenhum documento.`,
        doc.relPath);
    }

    // Link relativo, ao contrario, pode legitimamente apontar para fora das
    // raizes lidas — um .md do codigo, um arquivo que a wiki nao publica.
    for (const href of doc.relativosQuebrados ?? []) {
      add('info', 'ligacao',
        `O link <b>${href}</b> aponta para um arquivo que não está em nenhuma raiz lida. Ele continua na página, apontando para onde foi escrito.`,
        doc.relPath);
    }

    if (doc.updated && !/^\d{4}-\d{2}-\d{2}$/.test(doc.updated)) {
      add('info', 'frontmatter',
        `Campo <b>updated</b> com valor "${doc.updated}". O formato do padrão é AAAA-MM-DD.`,
        doc.relPath);
    }
  }

  agregar('info', 'adocao',
    (n) => `<b>${n} ${n === 1 ? 'arquivo ainda não tem' : 'arquivos ainda não têm'} frontmatter.</b> ${n === 1 ? 'Ele aparece' : 'Eles aparecem'} na wiki e na busca, mas sem tipo e sem entrar em nenhuma trilha.`,
    semFrontmatter);
  agregar('info', 'adocao',
    (n) => `<b>${n} ${n === 1 ? 'arquivo tem' : 'arquivos têm'} frontmatter sem o campo <code>type</code>.</b> Declarar o tipo é o menor passo para entrar no padrão.`,
    semTipo);
  agregar('info', 'adocao',
    (n) => `<b>${n} ${n === 1 ? 'arquivo declara um tipo' : 'arquivos declaram tipos'} fora do padrão.</b> Os tipos reconhecidos são: ${ORDEM_TIPOS.join(', ')}.`,
    tipoDesconhecido);

  // Cobertura da trilha so faz sentido quando o eixo e o card: e o card que
  // tem uma historia esperada (entende, especifica, decide, corrige, entrega).
  if (eixo.modo === 'card') {
    for (const card of grafo.cards) {
      if (!card.tiposPresentes.has('spec')) {
        const tem = [...card.tiposPresentes].map((t) => TIPOS[t]?.label ?? t).join(' e ');
        add('warn', 'cobertura',
          `<b>${card.id} está sem spec.</b> Existe ${tem || 'documentação'}, mas nada define o comportamento esperado.`,
          `card ${card.id}`);
      }
      if (!card.tiposPresentes.has('entendimento')) {
        add('info', 'cobertura',
          `<b>${card.id} não tem entendimento.</b> O título do card na wiki está vindo de outro documento.`,
          `card ${card.id}`);
      }
    }
  }

  return avisos.sort((a, b) => NIVEIS[b.nivel] - NIVEIS[a.nivel]);
}

function vazio(valor) {
  if (Array.isArray(valor)) return valor.length === 0;
  return valor == null || String(valor).trim() === '';
}

export function resumoAvisos(avisos) {
  return {
    total: avisos.length,
    crit: avisos.filter((a) => a.nivel === 'crit').length,
    warn: avisos.filter((a) => a.nivel === 'warn').length,
    info: avisos.filter((a) => a.nivel === 'info').length,
  };
}

/** Documentos sem nenhum aviso, para o numero de "validos" na home. */
export function docsValidos(grafo, avisos) {
  const comProblema = new Set();
  for (const aviso of avisos) {
    if (aviso.nivel === 'info') continue;
    comProblema.add(aviso.onde);
    // Aviso agregado nao tem um relPath em `onde`: os arquivos estao em `alvos`.
    for (const alvo of aviso.alvos ?? []) comProblema.add(alvo);
  }
  return grafo.docs.filter((doc) => !comProblema.has(doc.relPath)).length;
}

/**
 * Quanto do projeto ja esta no padrao. E o numero que substitui "erros" na
 * leitura de um projeto que adotou o Doczilla depois de pronto.
 */
export function progressoAdocao(grafo) {
  const total = grafo.docs.length;
  const noPadrao = grafo.docs.filter((doc) => doc.temFrontmatter && doc.type && TIPOS[doc.type]).length;
  return {
    total,
    noPadrao,
    fora: total - noPadrao,
    percentual: total ? Math.round((noPadrao / total) * 100) : 0,
  };
}
