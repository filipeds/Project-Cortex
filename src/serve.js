import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build } from './build.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Servidor local com recarga automatica. Existe so para quem esta escrevendo:
 * o artefato que o time consome continua sendo o site estatico do `build`.
 */
export async function serve({
  raiz = process.cwd(), porta = 4321, aoConstruir, invocacao = 'node bin/doczilla.js',
} = {}) {
  let versao = String(Date.now());
  let resultado = await build({ raiz, livereload: true, invocacao });
  aoConstruir?.(resultado, null);

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/__versao') {
      res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end(versao);
      return;
    }

    const nome = url.pathname === '/' ? '/index.html' : url.pathname;
    const destino = path.join(resultado.config.dirSaida, path.normalize(nome).replace(/^[\\/]+/, ''));

    // Nao serve nada fora de _site, mesmo com ".." no caminho. O separador no
    // fim importa: sem ele, uma pasta irma chamada "_site-backup" tambem
    // passaria no teste de prefixo.
    const dentro = resultado.config.dirSaida + path.sep;
    if (destino !== resultado.config.dirSaida && !destino.startsWith(dentro)) {
      res.writeHead(403).end('403');
      return;
    }

    try {
      const conteudo = await readFile(destino);
      res.writeHead(200, {
        'content-type': MIME[path.extname(destino).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(conteudo);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<meta charset="utf-8"><p style="font-family:sans-serif">404 — pagina nao encontrada. <a href="/">Voltar ao inicio</a></p>');
    }
  });

  await new Promise((resolver, rejeitar) => {
    servidor.once('error', rejeitar);
    // Escuta so no loopback. Sem o segundo argumento o Node abre em todas as
    // interfaces, e a documentacao interna do projeto ficaria legivel para
    // qualquer maquina da rede enquanto alguem estivesse escrevendo.
    servidor.listen(porta, '127.0.0.1', () => resolver());
  });

  // Rebuild com debounce: um save dispara varios eventos de fs.watch.
  let agendado = null;
  const reagendar = (arquivo) => {
    clearTimeout(agendado);
    agendado = setTimeout(async () => {
      try {
        resultado = await build({ raiz, livereload: true, invocacao });
        versao = String(Date.now());
        aoConstruir?.(resultado, arquivo);
      } catch (err) {
        aoConstruir?.(null, arquivo, err);
      }
    }, 120);
  };

  // Uma raiz por observador: o projeto pode ter a documentacao espalhada em
  // mais de uma pasta, e cada uma precisa disparar o rebuild.
  const observadores = resultado.config.raizes.map((raizDocs) => {
    // A saida do build costuma morar dentro da pasta observada, entao escrever
    // o site dispara o watcher e o build se realimenta. Ignoramos o que cai la.
    const relSaida = path
      .relative(raizDocs.abs, resultado.config.dirSaida)
      .split(path.sep)
      .join('/');

    return watch(raizDocs.abs, { recursive: true }, (_evento, arquivo) => {
      // Evento sem nome de arquivo nao da para classificar: ignorar e mais
      // seguro do que reconstruir, justamente por causa da saida do build.
      if (!arquivo) return;
      const rel = String(arquivo).split(path.sep).join('/');
      if (relSaida && !relSaida.startsWith('..') && rel.startsWith(relSaida)) return;
      if (!rel.toLowerCase().endsWith('.md')) return;
      reagendar(arquivo);
    });
  });

  return {
    porta,
    dirSaida: resultado.config.dirSaida,
    parar: () => {
      for (const observador of observadores) observador.close();
      servidor.close();
    },
  };
}
