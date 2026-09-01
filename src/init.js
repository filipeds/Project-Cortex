import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIPOS, ORDEM_TIPOS } from './schema.js';
import { carregarConfig } from './config.js';

const RAIZ_PACOTE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Cria a pasta docs/ com o padrao ja dentro: as seis pastas de tipo, o
 * DOCUMENTATION-GUIDE.md e um exemplo minimo de cada tipo.
 * Nunca sobrescreve arquivo existente: rodar init duas vezes e seguro.
 */
export async function init({ raiz = process.cwd(), exemplos = true } = {}) {
  const config = await carregarConfig(raiz);
  const criados = [];
  const mantidos = [];

  await mkdir(config.dirDocs, { recursive: true });

  const guia = await readFile(path.join(RAIZ_PACOTE, 'templates', 'DOCUMENTATION-GUIDE.md'), 'utf8');
  await escrever(path.join(config.dirDocs, 'DOCUMENTATION-GUIDE.md'), guia, criados, mantidos, config.dirDocs);

  for (const type of ORDEM_TIPOS) {
    const dir = path.join(config.dirDocs, TIPOS[type].dir);
    await mkdir(dir, { recursive: true });
    if (!exemplos) continue;
    const nome = type === 'regra' ? 'exemplo-regra.md' : `EXEMPLO-001-${type}.md`;
    await escrever(path.join(dir, nome), exemplo(type), criados, mantidos, config.dirDocs);
  }

  return { criados, mantidos, dirDocs: config.dirDocs };
}

async function escrever(destino, conteudo, criados, mantidos, raizDocs) {
  const rel = path.relative(raizDocs, destino).split(path.sep).join('/');
  try {
    await access(destino);
    mantidos.push(rel);
  } catch {
    await writeFile(destino, conteudo, 'utf8');
    criados.push(rel);
  }
}

/** Exemplo minimo, ja no padrao, para servir de molde ao primeiro documento real. */
function exemplo(type) {
  const comum = (extra = '') => `---
type: ${type}
title: ${TIPOS[type].label} de exemplo
${type === 'regra' ? '' : 'card: EXEMPLO-001\n'}status: rascunho
${extra}tags: [exemplo]
updated: ${hoje()}
---
`;

  const corpos = {
    entendimento: `${comum()}
## Qual é a dor hoje

Descreva o problema na linguagem de quem sofre com ele, sem falar de solução.

## O que se espera

O comportamento desejado, do ponto de vista do usuário.

## Como saberemos que resolveu

O sinal concreto de sucesso. Se não der para medir, ainda não está entendido.
`,
    spec: `${comum('reviewer: nome de quem revisou\n')}
## Contexto

Uma ou duas frases ligando esta spec ao entendimento do card.

## Comportamento esperado

O que o sistema faz, em que condições.

## Critérios de aceite

- Critério verificável, escrito de forma que dá para testar.
- Outro critério.

## Fora de escopo

O que foi levantado e deliberadamente deixado de fora.
`,
    arquitetura: `${comum('components: [ObjetoExemplo__c]\n')}
## Decisão

O caminho escolhido, em uma frase.

## Por que

O motivo, com o critério que pesou na escolha.

## O que foi descartado

As alternativas consideradas e a razão de cada uma não ter sido escolhida.
Esta seção é a que envelhece melhor: sem ela ninguém sabe se pode mudar.
`,
    bug: `${comum('severity: media\ncomponents: [ObjetoExemplo__c]\n')}
## Sintoma

O que o usuário viu acontecer, com passos para reproduzir.

## Causa raiz

O motivo real, não o sintoma. Se a explicação começa com "acho que", ainda
não é causa raiz.

## Correção

O que mudou, e por que isso resolve a causa e não o sintoma.
`,
    entrega: `${comum(`components: [ObjetoExemplo__c]\ndeployed: ${hoje()}\nrollback: como reverter em uma linha\n`)}
## O que foi entregue

Lista do que existe agora e não existia antes.

## Como validar em produção

Passos concretos para confirmar que funcionou.

## Como reverter

O plano de rollback, se algo der errado.
`,
    regra: `${comum()}
## A regra

O enunciado da regra, curto e sem ambiguidade.

## Desde quando vale

Data e o que mudou em relação ao que valia antes.

## Quem pode mudar

A área ou papel responsável por alterar esta regra.
`,
  };

  return corpos[type];
}

function hoje() {
  const agora = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}
