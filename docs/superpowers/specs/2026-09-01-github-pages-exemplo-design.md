# Publicar a wiki de demonstração no GitHub Pages

## Contexto

O README mostra o site gerado pelo Doczilla só como um GIF estático
(`docs-assets/preview/preview.gif`). Não há como clicar e navegar de verdade
sem clonar o repositório e rodar `build`. Ao mesmo tempo, `FLUXO-DA-EQUIPE.md`
já descreve como prática do projeto que `docs/_site/` seja versionado — mas o
`.gitignore` atual (`docs/_site/`) nunca deixou isso acontecer neste próprio
repositório. Esta mudança corrige a inconsistência e usa o resultado para dar
um exemplo ao vivo.

`main` hoje tem só o commit inicial (vazio). Todo o código do Doczilla e a
`docs/` de demonstração vivem em `feat/estrutura-do-sistema`, já publicado no
`origin`. Por decisão do usuário, `main` deve continuar enxuta — sem o código
da ferramenta nem a demonstração — então a publicação parte do próprio branch
de feature, sem merge para `main`.

## Objetivo

Dar um link público (`https://filipeds.github.io/Project-Cortex/`) que abre a
wiki gerada do "Projeto Órion" — a mesma navegação do GIF (início → card →
documento com backlinks → busca → mapa de ligações), mas navegável de verdade.

## O que muda

### 1. `.gitignore`

Remove a linha `docs/_site/`. As demais entradas (`node_modules/`, `*.log`,
`test/fixtures/**/_site/`, etc.) continuam — só a saída da demonstração passa
a ser versionada, como o próprio `FLUXO-DA-EQUIPE.md` já prescreve.

### 2. Regenerar `docs/_site/`

Antes de commitar:

```bash
node bin/doczilla.js build --verificar   # confere que a saída bate com os .md atuais
node bin/doczilla.js build               # gera de fato
```

Se `--verificar` já passar (saída em dia), o `build` normal reproduz os mesmos
bytes — reforça o invariante de build determinístico descrito no
`CLAUDE.md`. O commit inclui os arquivos gerados (`~32` arquivos, pelo número
citado em `FLUXO-DA-EQUIPE.md`).

### 3. `.github/workflows/pages.yml`

Workflow novo. Gatilho:

```yaml
on:
  push:
    branches: [feat/estrutura-do-sistema]
  workflow_dispatch:
```

Ele **não builda nada** — só publica o `docs/_site/` já commitado, via
`actions/upload-pages-artifact@v3` (path: `docs/_site`) e
`actions/deploy-pages@v4`. Isso é deliberado: a fonte de verdade do conteúdo
publicado é o commit, não uma rebuild em CI, o que mantém a garantia de que
"o que está no repositório é exatamente o que abre" — a mesma garantia que já
vale para quem dá `git pull` e abre `docs/_site/index.html` localmente.

Permissões do job: `pages: write`, `id-token: write`, ambiente
`github-pages`.

### 4. Ativar o GitHub Pages no repositório

Via `gh api repos/filipeds/Project-Cortex/pages`, fonte = GitHub Actions
(`build_type: workflow`), não a opção clássica de branch/pasta — não faria
sentido aqui já que o conteúdo está em `docs/_site/`, não na raiz nem em
`docs/`.

### 5. README

A seção "Como fica" ganha, junto ao GIF, um link para o site publicado —
algo como "veja funcionando: <link>" — sem remover o GIF (ele continua útil
para quem olha o README fora do navegador, ex. no editor).

## Fora do escopo

- Nenhuma mudança em `main`.
- Nenhuma mudança no pipeline do Doczilla (`load/graph/validate/render`).
- Não se cria branch `gh-pages` nem se usa a opção clássica de Pages — só
  Actions.

## Critério de aceite

- `https://filipeds.github.io/Project-Cortex/` abre a wiki do Projeto Órion e
  a navegação (card → documento → busca → mapa) funciona igual ao que o GIF
  mostra.
- Um novo push em `feat/estrutura-do-sistema` que mude `docs/_site/`
  republica automaticamente, sem passo manual.
- `main` permanece com apenas o commit inicial.
