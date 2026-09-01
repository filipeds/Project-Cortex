# Publicar wiki de demonstração no GitHub Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar um link público (`https://filipeds.github.io/Project-Cortex/`) que abre a wiki gerada do "Projeto Órion" navegável de verdade, publicado a partir do branch `feat/estrutura-do-sistema` sem tocar em `main`.

**Architecture:** `docs/_site/` passa a ser versionado (corrigindo o `.gitignore`, que hoje contradiz `FLUXO-DA-EQUIPE.md`). Um workflow do GitHub Actions publica esse conteúdo já commitado — sem rebuildar nada em CI — via `actions/upload-pages-artifact` + `actions/deploy-pages`, disparado por push em `feat/estrutura-do-sistema`.

**Tech Stack:** Node 18+ (Doczilla), GitHub Actions (`actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`), `gh` CLI para ativar o Pages via API.

## Global Constraints

- Nenhuma dependência de runtime nova (zero dependências continua valendo para o Doczilla em si — este trabalho não toca em `src/` nem `package.json`).
- `main` permanece com apenas o commit inicial — nenhuma tarefa toca em `main`.
- O build precisa continuar determinístico: `docs/_site/` commitado deve ser exatamente o que `node bin/doczilla.js build` produz a partir dos `.md` atuais, sem hora do relógio.
- Nenhuma mudança no pipeline `load/graph/validate/render`.
- Não criar branch `gh-pages` nem usar a opção clássica de Pages (branch/pasta) — só GitHub Actions como fonte.

---

### Task 1: Versionar `docs/_site/`

**Files:**
- Modify: `.gitignore`
- Create (via build, not by hand): `docs/_site/*.html`, `docs/_site/styles.css`, `docs/_site/app.js`

**Interfaces:**
- Consumes: `node bin/doczilla.js build` / `build --verificar` (comandos já existentes, ver `src/cli.js:209`, `src/cli.js:222`).
- Produces: `docs/_site/` versionado no git, ponto de partida para o Task 2 (é isso que o workflow vai publicar).

- [ ] **Step 1: Remover `docs/_site/` do `.gitignore`**

Editar `.gitignore` (raiz do repo), removendo a linha `docs/_site/`. Conteúdo final esperado:

```
node_modules/
*.log
.DS_Store
Thumbs.db
test/fixtures/**/_site/
```

- [ ] **Step 2: Confirmar que a saída atual está desatualizada (linha de base)**

Run: `node bin/doczilla.js build --verificar`
Expected: exit code 1, lista de arquivos `desatualizado` (a saída em disco hoje não bate com os `.md` atuais — ela nunca foi commitada nem mantida em dia).

- [ ] **Step 3: Gerar a saída atual**

Run: `node bin/doczilla.js build`
Expected: saída no terminal confirmando a escrita em `docs/_site/` (sem avisos críticos inesperados — os avisos propositais do Projeto Órion, ex. wikilink quebrado em `ORI-1487`, são esperados e não bloqueiam o build).

- [ ] **Step 4: Confirmar que a saída agora está em dia**

Run: `node bin/doczilla.js build --verificar`
Expected: exit code 0, mensagem `docs/_site/ está em dia com os documentos`.

- [ ] **Step 5: Rodar a suíte de testes para garantir que nada quebrou**

Run: `node --test "test/**/*.test.js"`
Expected: todos os testes passam (o `.gitignore` e o versionamento de `docs/_site/` não são cobertos por teste, mas o build em si precisa continuar íntegro).

- [ ] **Step 6: Commit**

```bash
git add .gitignore docs/_site
git status
git commit -m "chore: versionar docs/_site/ da demonstração, conforme FLUXO-DA-EQUIPE.md"
```

Confira no `git status` antes do commit que os arquivos adicionados são só os de `docs/_site/` (por volta de 30 arquivos HTML + `styles.css` + `app.js`) — nada de `node_modules` ou artefato inesperado.

---

### Task 2: Workflow do GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `docs/_site/` commitado pelo Task 1 (o workflow só empacota e publica essa pasta — não builda).
- Produces: pipeline de deploy que o Task 4 vai disparar e verificar.

- [ ] **Step 1: Criar o diretório e o workflow**

Criar `.github/workflows/pages.yml` com o seguinte conteúdo exato:

```yaml
name: Publicar exemplo no GitHub Pages

on:
  push:
    branches: [feat/estrutura-do-sistema]
  workflow_dispatch:

permissions:
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  publicar:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Preparar Pages
        uses: actions/configure-pages@v5

      - name: Upload do artefato (docs/_site)
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/_site

      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validar a sintaxe do YAML**

Run: `node -e "const {execSync}=require('child_process'); process.exit(0)"` não é necessário — em vez disso, valide com uma leitura simples via Node:

```bash
node -e "require('fs').readFileSync('.github/workflows/pages.yml','utf8')" && echo "arquivo legível"
```

(Não há linter de YAML no projeto — zero dependências — então a validação real acontece quando o GitHub Actions rodar, no Task 4. Este passo só confirma que o arquivo foi salvo sem corromper encoding.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: publicar docs/_site/ no GitHub Pages via Actions"
```

---

### Task 3: Link ao vivo no README

**Files:**
- Modify: `README.md` (seção "Como fica", por volta da linha 38-47)

**Interfaces:**
- Consumes: nenhuma (é só texto).
- Produces: nenhuma (folha da árvore).

- [ ] **Step 1: Editar a seção "Como fica"**

Adicionar uma linha logo antes do parágrafo final da seção, apontando para o site publicado. O bloco final deve ficar:

```markdown
## Como fica

![Preview do Doczilla: início com os números do projeto, a página de um card
com a trilha de documentos, a página de um documento com backlinks, busca ao
vivo no navegador e o mapa de ligações](docs-assets/preview/preview.gif)

**[Veja funcionando](https://filipeds.github.io/Project-Cortex/)** — a wiki do
Projeto Órion publicada de verdade, navegável no navegador.

Início → card → documento com backlinks → busca ao vivo → mapa de ligações.
Tudo isso é o site gerado por `build`: HTML e CSS estáticos, sem servidor
depois de pronto — o que aparece acima é exatamente o que abre por duplo
clique em `docs/_site/index.html`.
```

- [ ] **Step 2: Conferir o link visualmente**

Run: `grep -n "Veja funcionando" README.md`
Expected: uma linha de saída confirmando que o texto foi inserido no lugar certo (entre o GIF e o parágrafo "Início → card...").

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: linkar exemplo ao vivo no GitHub Pages a partir do README"
```

---

### Task 4: Publicar (push, ativar Pages, verificar)

**Files:** nenhum arquivo novo — esta tarefa executa ações de infraestrutura (push e configuração do repositório no GitHub).

**Interfaces:**
- Consumes: commits das Tasks 1-3, já no branch local `feat/estrutura-do-sistema`.
- Produces: repositório com GitHub Pages ativo e a wiki publicada.

**Atenção:** esta tarefa faz `git push` (visível a outros colaboradores) e muda uma configuração do repositório (ativa o GitHub Pages). Confirme com o usuário antes de rodar os steps 1 e 2 caso ainda não tenha confirmação explícita para esta sessão.

- [ ] **Step 1: Push do branch**

Run: `git push origin feat/estrutura-do-sistema`
Expected: push aceito, sem rejeição (branch já existe no remoto e é fast-forward).

- [ ] **Step 2: Ativar o GitHub Pages com fonte = GitHub Actions**

Run:
```bash
gh api --method POST repos/filipeds/Project-Cortex/pages -f build_type=workflow
```
Expected: JSON de resposta com `"build_type": "workflow"` e `"status": null` (site recém-criado, ainda sem build). Se retornar `422` dizendo que o Pages já está ativo, pule para o Step 3 — o site já existe.

- [ ] **Step 3: Acompanhar o workflow disparado pelo push**

Run: `gh run list --workflow=pages.yml --branch=feat/estrutura-do-sistema --limit 1`
Expected: uma execução com status `completed` / conclusion `success`. Se ainda estiver `in_progress`, rode `gh run watch <run-id>` até concluir.

- [ ] **Step 4: Confirmar que o site responde**

Run: `gh api repos/filipeds/Project-Cortex/pages --jq .html_url`
Expected: imprime `https://filipeds.github.io/Project-Cortex/`. Em seguida, confirme com um GET simples:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://filipeds.github.io/Project-Cortex/
```
Expected: `200`.

- [ ] **Step 5: Checagem final manual**

Abrir `https://filipeds.github.io/Project-Cortex/` no navegador e navegar: início → um card → um documento (conferir backlinks) → busca → mapa de ligações. Confirma visualmente que bate com o que o GIF do README mostra.
