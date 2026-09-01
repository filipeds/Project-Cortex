import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { build } from './build.js';
import { init } from './init.js';
import { serve } from './serve.js';
import { analisar, escreverPerfil } from './analyze.js';

/**
 * Como o Doczilla foi de fato chamado ("node bin/doczilla.js" ou
 * "node ferramentas/doczilla/bin/doczilla.js", dependendo de onde foi
 * copiado). Não existe pacote publicado, então nenhuma mensagem pode dizer
 * "npx doczilla" — isso implicaria uma instalação que não existe. Em vez de
 * adivinhar, lemos o caminho real que o processo recebeu.
 */
function invocacaoAtual() {
  const script = process.argv[1];
  if (!script) return 'node bin/doczilla.js';
  const relativo = path.relative(process.cwd(), script).split(path.sep).join('/');
  // Fora da arvore do diretorio atual, o caminho relativo vira uma sequencia
  // de "../../.." dificil de reaproveitar. O caminho absoluto, apesar de
  // longo, pelo menos funciona se colado num terminal em outro lugar.
  const caminho = !relativo || relativo.startsWith('..') ? script.split(path.sep).join('/') : relativo;
  return `node ${caminho}`;
}

function ajuda(invocacao) {
  return `
  doczilla — gera uma wiki estática e offline a partir da pasta docs/

  Uso:
    ${invocacao} init            cria docs/ com o padrão e um exemplo de cada tipo
    ${invocacao} analisar        lê o projeto como ele é hoje e propõe um perfil
    ${invocacao} build           lê docs/, valida e escreve o site em docs/_site/
    ${invocacao} serve           servidor local com recarga automática

  Opções:
    --dir <caminho>              raiz do projeto (padrão: pasta atual)
    --porta <número>             porta do serve (padrão: 4321)
    --strict                     build falha se houver aviso crítico
    --verificar                  build não escreve: falha se a saída estiver fora de dia
    --quiet                      só imprime erros
    --sem-exemplos               init cria as pastas sem documento de exemplo
    --escrever                   analisar grava o perfil no doczilla.config.json
    --carimbo <texto>            assina o rodapé do site (ex.: o commit, na CI)
    -h, --help                   esta ajuda
`;
}

export async function run(argv) {
  const { comando, flags } = parseArgv(argv);
  const invocacao = invocacaoAtual();

  if (!comando || flags.help) {
    console.log(ajuda(invocacao));
    return;
  }

  const raiz = path.resolve(flags.dir ?? process.cwd());

  switch (comando) {
    case 'init':
      return comandoInit(raiz, flags, invocacao);
    case 'analisar':
      return comandoAnalisar(raiz, flags, invocacao);
    case 'build':
      return comandoBuild(raiz, flags, invocacao);
    case 'serve':
      return comandoServe(raiz, flags, invocacao);
    default:
      throw new Error(`comando desconhecido: "${comando}". Rode "${invocacao} --help".`);
  }
}

function parseArgv(argv) {
  const flags = {};
  let comando = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') { flags.help = true; continue; }
    if (arg === '--strict') { flags.strict = true; continue; }
    if (arg === '--quiet') { flags.quiet = true; continue; }
    if (arg === '--sem-exemplos') { flags.semExemplos = true; continue; }
    if (arg === '--escrever') { flags.escrever = true; continue; }
    if (arg === '--verificar') { flags.verificar = true; continue; }
    if (arg === '--carimbo') { flags.carimbo = argv[i + 1]; i += 1; continue; }
    if (arg === '--dir') { flags.dir = argv[i + 1]; i += 1; continue; }
    if (arg === '--porta') { flags.porta = Number(argv[i + 1]); i += 1; continue; }
    if (!arg.startsWith('-') && !comando) { comando = arg; continue; }
  }

  return { comando, flags };
}

/* ----------------------------------------------------------------
   Comandos
   ---------------------------------------------------------------- */

async function comandoInit(raiz, flags, invocacao) {
  const { criados, mantidos, dirDocs } = await init({ raiz, exemplos: !flags.semExemplos });

  console.log(`\n  ${path.relative(raiz, dirDocs) || 'docs'}/ pronto\n`);
  for (const arquivo of criados) console.log(`    criado    ${arquivo}`);
  for (const arquivo of mantidos) console.log(`    mantido   ${arquivo}`);

  console.log(`
  Próximos passos:
    1. Aponte seu CLAUDE.md (ou AGENTS.md) para docs/DOCUMENTATION-GUIDE.md,
       para que a IA escreva sempre no mesmo padrão.
    2. Escreva o primeiro documento real e apague os de exemplo.
    3. Rode "${invocacao} build" e abra docs/_site/index.html.
`);
}

async function comandoAnalisar(raiz, flags, invocacao) {
  const analise = await analisar({ raiz });

  if (!analise.total) {
    console.log(`\n  nenhum arquivo .md encontrado em ${raiz}\n`);
    return;
  }

  const { eixo } = analise;
  console.log(`
  ${path.basename(raiz)}
  ${analise.total} arquivos Markdown em ${analise.pastas.length} ${analise.pastas.length === 1 ? 'pasta' : 'pastas'}
`);

  console.log('  Pastas com documentação\n');
  for (const pasta of analise.pastas) {
    const papel = pasta.tipoSugerido ? `  → parece ${pasta.tipoSugerido}` : '';
    console.log(`    ${pasta.caminho.padEnd(34)} ${String(pasta.total).padStart(4)} .md · ${String(pasta.percentualFrontmatter).padStart(3)}% com frontmatter${papel}`);
    if (pasta.camposComuns.length) {
      console.log(`    ${' '.repeat(34)}      campos: ${pasta.camposComuns.map((c) => c.campo).join(', ')}`);
    }
  }

  const comoEixo = {
    card: `campo "card" no frontmatter, em ${eixo.cobertura}% dos documentos`,
    chave: `marca ${eixo.padrao} no nome ou no título, em ${eixo.cobertura}% dos documentos`,
    pasta: 'a própria divisão de pastas (nenhuma outra marca se repetiu o bastante)',
  }[eixo.modo];

  console.log(`
  Eixo de agrupamento
    ${eixo.modo} — ${comoEixo}`);
  if (eixo.descartado) {
    console.log(`    o melhor palpite alternativo (${eixo.descartado.padrao}) ficou em ${eixo.descartado.cobertura}%`);
  }

  const totalRelativos = analise.docs.reduce((s, d) => s + d.relativos, 0);
  const totalWikilinks = analise.docs.reduce((s, d) => s + d.wikilinks, 0);
  console.log(`
  Ligações encontradas
    ${totalRelativos} links relativos entre arquivos .md
    ${totalWikilinks} wikilinks [[...]]${analise.ligacoes.campos.length ? `\n    campos de frontmatter lidos como ligação: ${analise.ligacoes.campos.join(', ')}` : ''}
`);

  console.log('  Perfil proposto\n');
  console.log(JSON.stringify({ perfil: analise.perfil }, null, 2).split('\n').map((l) => `    ${l}`).join('\n'));

  if (!flags.escrever) {
    console.log(`
  Nada foi gravado. Revise o perfil acima e rode de novo com --escrever
  para colocá-lo no doczilla.config.json, ou cole-o lá à mão.
`);
    return;
  }

  const caminho = await escreverPerfil(raiz, analise.perfil);
  console.log(`
  perfil gravado em ${path.relative(raiz, caminho) || 'doczilla.config.json'}

  Próximo passo: "${invocacao} build" e abra o site. A tela "Mapa" mostra o
  que foi entendido do projeto; se algo estiver errado, corrija o perfil.
`);
}

/**
 * Confere se o site versionado no repositorio corresponde aos documentos.
 *
 * Existe por causa de um modo de falha unico e previsivel: alguem edita um
 * .md, esquece de rodar o build, e a main passa a ter documentacao nova com
 * wiki velha — sem ninguem perceber, porque nada quebra. Este comando quebra.
 *
 * Nao escreve nada: so compara e diz o que esta fora de dia.
 */
async function comandoVerificar(raiz, flags, invocacao) {
  const resultado = await build({
    raiz, escrever: false, carimboTexto: flags.carimbo ?? '', invocacao,
  });
  const { dirSaida } = resultado.config;
  const saida = path.relative(raiz, dirSaida).split(path.sep).join('/');
  const problemas = [];

  // O git converte quebra de linha no checkout (autocrlf no Windows), entao o
  // arquivo em disco pode ter CRLF onde o build escreveu LF. Sao o mesmo
  // arquivo para o git; comparar byte a byte acusaria a saida inteira como
  // desatualizada em toda clonagem nova.
  const semCR = (texto) => texto.replace(/\r\n/g, '\n');

  for (const [nome, conteudo] of resultado.arquivos) {
    let atual = null;
    try {
      atual = await readFile(path.join(dirSaida, nome), 'utf8');
    } catch { /* nao existe: reportado abaixo como faltando */ }

    if (atual === null) problemas.push(['faltando   ', nome]);
    else if (semCR(atual) !== semCR(conteudo)) problemas.push(['desatualizado', nome]);
  }

  // Pagina de documento apagado que sobreviveu ao ultimo build.
  let naSaida = [];
  try {
    naSaida = await readdir(dirSaida);
  } catch { /* pasta inexistente: os "faltando" acima ja contam a historia */ }
  for (const nome of naSaida) {
    if (!resultado.arquivos.has(nome)) problemas.push(['sobrando   ', nome]);
  }

  if (!problemas.length) {
    if (!flags.quiet) console.log(`\n  ${saida}/ está em dia com os documentos\n`);
    return;
  }

  console.error(`\n  ${saida}/ não corresponde aos documentos:\n`);
  for (const [estado, nome] of problemas.slice(0, 15)) {
    console.error(`    ${estado}  ${nome}`);
  }
  if (problemas.length > 15) console.error(`    e mais ${problemas.length - 15}`);

  throw new Error(
    `${problemas.length} ${problemas.length === 1 ? 'arquivo' : 'arquivos'} fora de dia.\n`
    + `  Rode "${invocacao} build" e inclua a pasta de saída no commit.`,
  );
}

async function comandoBuild(raiz, flags, invocacao) {
  if (flags.verificar) return comandoVerificar(raiz, flags, invocacao);

  const resultado = await build({ raiz, carimboTexto: flags.carimbo ?? '', invocacao });
  if (!flags.quiet) imprimirResultado(resultado, raiz);

  if (flags.strict && resultado.resumo.crit > 0) {
    throw new Error(
      `${resultado.resumo.crit} ${resultado.resumo.crit === 1 ? 'aviso crítico' : 'avisos críticos'} com --strict ligado.`,
    );
  }
}

async function comandoServe(raiz, flags, invocacao) {
  const porta = Number.isFinite(flags.porta) ? flags.porta : 4321;

  const servidor = await serve({
    raiz,
    porta,
    invocacao,
    aoConstruir: (resultado, arquivo, erro) => {
      if (erro) {
        console.error(`  falhou ao reconstruir após ${arquivo}: ${erro.message}`);
        return;
      }
      if (!arquivo) {
        imprimirResultado(resultado, raiz);
        console.log(`  servindo em http://localhost:${porta}  (Ctrl+C para parar)\n`);
        return;
      }
      const { resumo } = resultado;
      const aviso = resumo.total ? ` · ${resumo.total} ${resumo.total === 1 ? 'aviso' : 'avisos'}` : '';
      console.log(`  ${hora()} reconstruído após ${arquivo}${aviso}`);
    },
  });

  const encerrar = () => {
    servidor.parar();
    console.log('\n  servidor encerrado\n');
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);

  // Mantem o processo vivo enquanto o servidor estiver ouvindo.
  await new Promise(() => {});
}

function imprimirResultado(resultado, raiz) {
  const { grafo, avisos, resumo, config, paginas, ms } = resultado;
  const saida = path.relative(raiz, config.dirSaida).split(path.sep).join('/');

  console.log(`
  ${config.nome}
  ${grafo.docs.length} documentos · ${grafo.cards.length} cards · ${paginas} arquivos em ${saida}/ · ${ms} ms`);

  if (!avisos.length) {
    console.log('\n  nenhum aviso: todos os documentos seguem o padrão\n');
    return;
  }

  console.log(`\n  ${resumo.crit} críticos · ${resumo.warn} avisos · ${resumo.info} observações\n`);

  for (const aviso of avisos) {
    const marca = { crit: '  x ', warn: '  ! ', info: '  · ' }[aviso.nivel];
    console.log(`${marca}${aviso.onde}`);
    console.log(`      ${semTags(aviso.mensagem)}`);
  }
  console.log('');
}

function semTags(html) {
  return String(html).replace(/<[^>]+>/g, '');
}

function hora() {
  const agora = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}`;
}
