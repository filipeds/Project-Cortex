/**
 * Parser de frontmatter YAML.
 *
 * Cobre deliberadamente um subconjunto do YAML: pares chave/valor, listas
 * inline e listas em bloco. E o que o padrao do Doczilla usa, e evita arrastar
 * uma dependencia de YAML completa para dentro de um projeto Salesforce.
 * O que estiver fora do subconjunto vira string crua, nunca um erro.
 */

const DELIM = /^---\s*$/;

/**
 * @param {string} raw conteudo integral do arquivo .md
 * @returns {{data: Record<string, any>, body: string, temFrontmatter: boolean}}
 */
export function parseFrontmatter(raw) {
  const texto = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const linhas = texto.split('\n');

  if (!DELIM.test(linhas[0] ?? '')) {
    return { data: {}, body: texto, temFrontmatter: false };
  }

  let fim = -1;
  for (let i = 1; i < linhas.length; i += 1) {
    if (DELIM.test(linhas[i])) {
      fim = i;
      break;
    }
  }
  // Abre mas nao fecha: tratamos o arquivo inteiro como corpo em vez de
  // engolir o texto todo como metadado.
  if (fim === -1) {
    return { data: {}, body: texto, temFrontmatter: false };
  }

  const data = parseBloco(linhas.slice(1, fim));
  const body = linhas.slice(fim + 1).join('\n').replace(/^\n+/, '');
  return { data, body, temFrontmatter: true };
}

function parseBloco(linhas) {
  const data = {};
  let chaveAberta = null; // chave esperando itens "- " indentados

  for (const linha of linhas) {
    if (!linha.trim() || /^\s*#/.test(linha)) continue;

    const itemLista = linha.match(/^\s+-\s+(.*)$/);
    if (itemLista && chaveAberta) {
      data[chaveAberta].push(coerce(itemLista[1]));
      continue;
    }

    const par = linha.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!par) continue;

    const [, chave, bruto] = par;
    const valor = bruto.trim();

    if (valor === '') {
      // "chave:" sozinha abre uma lista em bloco. Se nada vier, vira [].
      data[chave] = [];
      chaveAberta = chave;
      continue;
    }

    chaveAberta = null;
    data[chave] = valor.startsWith('[') && valor.endsWith(']')
      ? parseListaInline(valor)
      : coerce(valor);
  }

  return data;
}

function parseListaInline(valor) {
  const dentro = valor.slice(1, -1).trim();
  if (!dentro) return [];
  return dentro.split(',').map((item) => coerce(item.trim())).filter((item) => item !== '');
}

function coerce(bruto) {
  let valor = String(bruto).trim();

  const aspas = valor.match(/^"(.*)"$/s) || valor.match(/^'(.*)'$/s);
  if (aspas) return aspas[1];

  // Comentario a direita so e removido em valor sem aspas, e exige espaco
  // antes do "#" para nao destruir URLs com fragmento ou cores hex.
  const comentario = valor.match(/^(.*?)\s+#\s.*$/);
  if (comentario) valor = comentario[1].trim();

  if (valor === 'true') return true;
  if (valor === 'false') return false;
  if (valor === 'null' || valor === '~') return null;

  return valor;
}

/** Garante array a partir de campo que pode vir string, lista ou vazio. */
export function comoLista(valor) {
  if (valor == null || valor === '') return [];
  if (Array.isArray(valor)) return valor.filter((v) => v !== '' && v != null).map(String);
  return [String(valor)];
}
