import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Parseia a saida de
 * `git log --name-status --date=short --pretty=format:@@%H|%an|%ad -- <caminhos>`.
 * Funcao pura: nao chama git, so interpreta texto. E o que torna o modulo
 * testavel sem repositorio git de verdade.
 */
export function parseLogGit(saida, toplevel) {
  const commits = [];
  let atual = null;

  for (const linhaBruta of saida.split('\n')) {
    const linha = linhaBruta.trimEnd();
    if (linha.startsWith('@@')) {
      const [sha, autor, data] = linha.slice(2).split('|');
      atual = { sha, autor, data, arquivos: [] };
      commits.push(atual);
      continue;
    }
    if (!linha || !atual) continue;

    const partes = linha.split('\t');
    if (partes.length < 2) continue;
    // Rename vem como "R100\tantigo\tnovo": o ultimo campo e sempre o
    // caminho atual, tanto em rename (3 campos) quanto no resto (2 campos).
    const status = partes[0][0];
    const caminhoAtual = partes[partes.length - 1];
    if (status === 'D') continue;

    atual.arquivos.push({
      acao: status === 'A' ? 'criou' : 'editou',
      absPath: `${toplevel}/${caminhoAtual}`,
    });
  }

  const ultimaAlteracao = commits.length
    ? { autor: commits[0].autor, data: commits[0].data }
    : null;

  const entradas = commits.flatMap((c) => c.arquivos.map((a) => ({
    autor: c.autor,
    data: c.data,
    acao: a.acao,
    absPath: a.absPath,
  })));

  return { ultimaAlteracao, entradas };
}

/**
 * Casa o historico bruto (por caminho absoluto) com os documentos do grafo
 * atual. Entrada sem doc correspondente (apagado, movido para fora das
 * raizes lidas) e descartada: nao ha para onde linkar.
 */
export function casarComGrafo(historicoGit, grafo) {
  if (!historicoGit.disponivel) {
    return { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }

  const porAbsPath = new Map(grafo.docs.map((doc) => [doc.absPath, doc]));
  const entradas = historicoGit.entradas
    .map((entrada) => {
      const doc = porAbsPath.get(entrada.absPath);
      if (!doc) return null;
      return {
        autor: entrada.autor,
        data: entrada.data,
        acao: entrada.acao,
        href: doc.href,
        title: doc.title,
        relPath: doc.relPath,
      };
    })
    .filter(Boolean);

  // A ultima alteracao sai do `entradas` ja casado (mais novo primeiro), nunca
  // do commit bruto: commit que so regenera `docs/_site/` nao pode mover o alvo.
  const ultimaAlteracao = entradas.length
    ? { autor: entradas[0].autor, data: entradas[0].data }
    : null;

  return { disponivel: true, ultimaAlteracao, entradas };
}

/**
 * Fonte real: pergunta ao git o que aconteceu nos caminhos de docs/. Nunca
 * lanca — qualquer falha (git ausente, pasta fora de um repo, comando sem
 * permissao) vira `disponivel: false`, e o resto da wiki segue normalmente.
 */
export async function obterHistoricoGit({ raiz, raizes }) {
  try {
    const { stdout: topBruto } = await execFileAsync(
      'git',
      ['-c', 'core.quotepath=false', 'rev-parse', '--show-toplevel'],
      { cwd: raiz },
    );
    const toplevel = topBruto.trim();

    const caminhos = raizes.map((r) => r.abs);
    const { stdout: saida } = await execFileAsync(
      'git',
      // `--max-count` limita a saida (so 40 entradas sao exibidas) e `maxBuffer`
      // cobre o pior caso: o padrao de 1 MiB estoura em repositorio grande e a
      // falha viraria um `disponivel: false` silencioso.
      ['-c', 'core.quotepath=false', 'log', '--name-status', '--date=short', '--max-count=500', '--pretty=format:@@%H|%an|%ad', '--', ...caminhos],
      { cwd: raiz, maxBuffer: 20 * 1024 * 1024 },
    );

    const { ultimaAlteracao, entradas } = parseLogGit(saida, toplevel);
    return { disponivel: true, ultimaAlteracao, entradas };
  } catch {
    return { disponivel: false, ultimaAlteracao: null, entradas: [] };
  }
}
