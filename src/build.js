import { mkdir, writeFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { carregarConfig } from './config.js';
import { carregarDocumentos } from './load.js';
import { montarGrafo } from './graph.js';
import { validar, resumoAvisos, docsValidos, progressoAdocao } from './validate.js';
import { obterHistoricoGit, casarComGrafo } from './historico.js';
import { CSS } from './render/styles.js';
import { APP_JS, LIVERELOAD_JS } from './render/app-js.js';
import { renderHome, renderListaCards, renderListaDocumentos } from './render/pages-home.js';
import { renderCard, renderDocumento } from './render/pages-doc.js';
import { renderBusca, renderGrafo, renderPadrao, renderMapa } from './render/pages-extra.js';
import { renderHistorico } from './render/pages-historico.js';

/**
 * Le docs/, monta o grafo, valida e escreve o site em docs/_site/.
 * Nunca lanca por causa de documento fora do padrao: os problemas voltam em
 * `avisos` e quem decide o que fazer com eles e o chamador.
 */
export async function build({
  raiz = process.cwd(), livereload = false, carimboTexto = '', escrever = true,
  invocacao = 'node bin/doczilla.js', obterHistorico = obterHistoricoGit,
} = {}) {
  const inicio = Date.now();
  const config = await carregarConfig(raiz);

  await garantirDocs(config.dirDocs, invocacao);

  const docs = await carregarDocumentos(config.raizes, {
    ignorar: config.perfil?.ignorar ?? [],
    dirSaida: config.dirSaida,
  });
  const grafo = montarGrafo(docs, {
    eixo: config.eixo,
    ligacoes: config.ligacoes,
    regime: config.regime,
  });
  let historico;
  try {
    const historicoGit = await obterHistorico({ raiz, raizes: config.raizes });
    historico = casarComGrafo(historicoGit, grafo);
  } catch {
    historico = { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }

  const avisos = validar(grafo, { regime: config.regime });
  const resumo = resumoAvisos(avisos);
  const validos = docsValidos(grafo, avisos);

  const projeto = {
    nome: config.nome,
    plataforma: config.plataforma,
    dirDocs: config.rotuloDocs,
    raizes: config.raizes,
    regime: config.regime,
    dirSaida: `${path.relative(raiz, config.dirSaida).split(path.sep).join('/')}/`,
    eixo: config.eixo,
    totalDocs: docs.length,
    build: carimbo(docs, { relogio: livereload, texto: carimboTexto }),
    livereload,
    historico,
    // Como este build foi de fato invocado, para os comandos que a wiki
    // sugere (no cartão do "build", no aviso de excesso) serem copiáveis de
    // verdade — não existe pacote publicado, então nunca "npx doczilla".
    invocacao,
  };

  const paginas = new Map();
  paginas.set('index.html', renderHome({ grafo, avisos, resumo, validos, projeto }));
  paginas.set('cards.html', renderListaCards({ grafo, projeto }));
  paginas.set('documentos.html', renderListaDocumentos({ grafo, projeto }));
  paginas.set('busca.html', renderBusca({ grafo, projeto }));
  paginas.set('grafo.html', renderGrafo({ grafo, projeto }));
  paginas.set('historico.html', renderHistorico({ grafo, projeto }));
  paginas.set('padrao.html', renderPadrao({ grafo, projeto }));
  // O mapa so existe onde houve pre-leitura: num projeto que nasceu com o
  // padrao, nao ha organizacao a descobrir, e a pagina Padrao ja conta tudo.
  if (config.regime === 'descoberto') {
    paginas.set('mapa.html', renderMapa({ grafo, projeto, adocao: progressoAdocao(grafo) }));
  }

  for (const card of grafo.cards) {
    paginas.set(card.href, renderCard({ card, grafo, projeto }));
  }
  for (const doc of grafo.docs) {
    paginas.set(doc.href, renderDocumento({ doc, grafo, projeto }));
  }

  // Um mapa unico com tudo que a saida deve conter. E a fonte da verdade
  // tanto para escrever quanto para o --verificar comparar com o disco.
  const arquivos = new Map(paginas);
  arquivos.set('styles.css', CSS.trimStart());
  arquivos.set('app.js', APP_JS);
  if (livereload) arquivos.set('livereload.js', LIVERELOAD_JS);

  if (escrever) {
    // Regera do zero: pagina de documento apagado nao pode sobreviver ao build.
    // Antes de apagar, confere que a pasta de saida e mesmo uma pasta de saida:
    // um "saida": "." ou "saida": "src" no config apagaria o repositorio.
    garantirSaidaSegura(config, raiz);
    await rm(config.dirSaida, { recursive: true, force: true });
    await mkdir(config.dirSaida, { recursive: true });

    for (const [nome, conteudo] of arquivos) {
      await writeFile(path.join(config.dirSaida, nome), conteudo, 'utf8');
    }
  }

  return {
    config,
    grafo,
    avisos,
    resumo,
    validos,
    paginas: arquivos.size,
    // Todo arquivo que a saida deve conter, por nome.
    arquivos,
    // O HTML de cada pagina, para o teste poder olhar o que foi gerado sem
    // reler o disco. O `paginas` acima continua sendo a contagem de arquivos.
    paginasHtml: paginas,
    ms: Date.now() - inicio,
  };
}

/**
 * O build apaga a pasta de saida inteira antes de reescreve-la. Isso e certo
 * para uma pasta que so contem site gerado, e catastrofico para qualquer
 * outra. Um `saida` errado no config nao pode custar codigo-fonte a ninguem.
 */
export function garantirSaidaSegura(config, raiz) {
  const saida = path.resolve(config.dirSaida);
  const projeto = path.resolve(raiz);
  const recusar = (motivo) => {
    throw new Error(
      `pasta de saida recusada: ${saida}\n  ${motivo}\n`
      + '  Ajuste "saida" no doczilla.config.json para uma pasta usada so pelo site.',
    );
  };

  if (saida === projeto) recusar('e a raiz do projeto.');
  if (projeto.startsWith(saida + path.sep)) recusar('contem a raiz do projeto.');
  for (const raizDocs of config.raizes) {
    const abs = path.resolve(raizDocs.abs);
    if (saida === abs) recusar(`e a raiz de documentacao "${raizDocs.rel}".`);
    if (abs.startsWith(saida + path.sep)) recusar(`contem a raiz de documentacao "${raizDocs.rel}".`);
  }
}

async function garantirDocs(dirDocs, invocacao) {
  try {
    await access(dirDocs);
  } catch {
    throw new Error(
      `pasta "${path.basename(dirDocs)}" nao encontrada em ${path.dirname(dirDocs)}.\n`
      + `  Rode "${invocacao} init" para cria-la com o padrao ja dentro.`,
    );
  }
}

/**
 * A frase de data que aparece no topo e no rodape de toda pagina.
 *
 * Fora do `serve`, ela vem do conteudo — a data mais recente entre os
 * documentos — e nao do relogio. Dois motivos:
 *
 *  1. O build fica deterministico. Rodar duas vezes sem mexer em documento
 *     produz arquivos identicos, entao dá para versionar a saida sem que cada
 *     merge vire um diff de dezenas de arquivos que so mudaram de horario.
 *  2. Diz algo util a quem le. "Quando alguem rodou um comando" nao informa
 *     nada; "a documentacao mais nova aqui e de 24/08" informa.
 *
 * No `serve` o relogio volta, porque ali o carimbo serve de confirmacao visual
 * de que a pagina recarregou.
 */
export function carimbo(docs, { relogio = false, texto = '' } = {}) {
  if (texto) return texto;

  if (relogio) {
    const agora = new Date();
    const dois = (n) => String(n).padStart(2, '0');
    return `build de ${dois(agora.getDate())}/${dois(agora.getMonth() + 1)} as ${dois(agora.getHours())}:${dois(agora.getMinutes())}`;
  }

  // As datas ja vem no formato AAAA-MM-DD, entao a ordem alfabetica e a
  // cronologica. Valor fora do formato e ignorado: a validacao ja avisa dele.
  const maisRecente = docs
    .map((doc) => doc.updated)
    .filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data))
    .sort()
    .pop();

  if (!maisRecente) return '';
  const [ano, mes, dia] = maisRecente.split('-');
  return `documentação de ${dia}/${mes}/${ano}`;
}
