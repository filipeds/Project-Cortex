# Segurança e implantação em projetos de trabalho

Este documento existe para ser lido por quem precisa aprovar a entrada do
Doczilla num repositório corporativo. Descreve o que a ferramenta faz, o que
ela deliberadamente não faz, os problemas encontrados na auditoria do próprio
código e como instalá-la sem depender do registro público de pacotes.

Cada afirmação aqui pode ser reconferida com os comandos indicados.

## O que a ferramenta é

Um gerador de site estático em JavaScript puro, rodando no Node 18+, **sem
nenhuma dependência de runtime**. Lê arquivos `.md` e escreve arquivos `.html`.

```bash
node -e "const p=require('./package.json'); console.log(p.dependencies ?? 'sem dependencies')"
```

Isso é o centro do argumento de segurança: não há árvore de `node_modules`
para auditar, nem atualização de terceiro que possa mudar o comportamento da
ferramenta sem alguém revisar. O parser de frontmatter, o renderer Markdown e o
gerador de HTML são código próprio, no repositório, legível em uma tarde.

## O que ela não faz

| Não faz | Como conferir |
|---|---|
| Não acessa a rede. Não há cliente HTTP, telemetria ou "check for updates" | `grep -rn "fetch\|https\?\.\|net\.\|dns\." src/ bin/` — três ocorrências, todas locais: o `http.createServer` do `serve`, o `fetch('/__versao')` da recarga automática (que só entra no site quando se usa `serve`) e um comentário |
| Não executa código vindo de documento | `grep -rn "eval(\|new Function\|child_process\|execSync\|spawn" src/ bin/` — nenhuma ocorrência |
| Não lê fora das pastas declaradas | As raízes vêm de `docs` ou de `perfil.raizes` no config; nada entra sem estar declarado |
| Não segue link simbólico | `load.js` só aceita arquivo comum (`entrada.isFile()`) |
| Não escreve fora da pasta de saída | `build.js` só escreve em `dirSaida`; `init.js` só cria a pasta de documentação |
| Não altera código-fonte, metadados Salesforce ou configuração do projeto | O único arquivo do projeto que ela pode escrever é o `doczilla.config.json`, e só com `analisar --escrever` |

O comando `analisar` é somente leitura por definição: sem a flag `--escrever`,
imprime a proposta no terminal e não toca em nada.

## Auditoria: o que foi encontrado e corrigido

Cinco problemas reais foram encontrados ao revisar o código com essa pergunta
em mente. Todos estão corrigidos.

### 1. XSS armazenado no site gerado — corrigido

Um documento contendo `[clique](javascript:alert(document.cookie))` gerava um
link `javascript:` clicável no HTML. Como a wiki circula por e-mail e pasta de
rede e é aberta em `file://`, isso significava execução de código no navegador
de quem abrisse a página, a partir de conteúdo escrito por qualquer pessoa com
acesso de escrita à documentação — ou copiado de fora.

Corrigido com lista de permissão de esquemas (`http`, `https`, `mailto`, `tel`,
`ftp`) em `hrefSeguro()`. `javascript:`, `data:`, `vbscript:` e `file:` não
viram link: o texto continua legível, sem nada para clicar. A verificação
remove espaço e caractere de controle antes de olhar o esquema, porque o
navegador também os ignora.

Tags HTML no meio do Markdown já eram escapadas, e continuam sendo — o renderer
não aceita HTML cru de propósito.

### 2. `serve` escutando em todas as interfaces — corrigido

`servidor.listen(porta)` sem endereço faz o Node escutar em `0.0.0.0`. Enquanto
alguém estivesse escrevendo documentação, a documentação interna do projeto
ficava legível para qualquer máquina da rede — escritório, VPN ou wi-fi de
cafeteria.

Agora escuta em `127.0.0.1`. Verificável:

```bash
node bin/doczilla.js serve      # em outro terminal, tente pelo IP da máquina
```

O teste automatizado confirma que a conexão pelo IP de rede é recusada.

### 3. Travessia de caminho por prefixo no `serve` — corrigido

A verificação `destino.startsWith(dirSaida)` deixava passar uma pasta irmã cujo
nome começasse igual (`_site-backup`). Agora a comparação exige o separador de
caminho. É um servidor de desenvolvimento local, mas a correção é de uma linha.

### 4. `saida` mal configurado apagando o repositório — corrigido

O build apaga a pasta de saída inteira antes de reescrevê-la. Um
`"saida": "."` ou `"saida": "src"` no `doczilla.config.json` apagaria o
projeto. Não é falha de segurança no sentido estrito, mas é perda de dados a um
typo de distância.

`garantirSaidaSegura()` agora recusa qualquer saída que seja, ou contenha, a
raiz do projeto ou uma raiz de documentação, com mensagem explicando o motivo.

### 5. Link simbólico publicado como documento — corrigido

Um symlink chamado `notas.md` apontando para fora do projeto seria lido e teria
o conteúdo publicado na wiki. Agora só arquivo comum vira documento.

### Verificado e sem problema

- **Poluição de protótipo pelo frontmatter**: `__proto__` num documento não
  contamina `Object.prototype`. O parser é um subconjunto de YAML escrito à
  mão — sem tags, sem âncoras, sem as construções que tornam parsers YAML
  completos perigosos com entrada não confiável.
- **Escapagem no HTML**: todo texto vindo de documento passa por
  `escapeHtml()`; o índice de busca embutido passa por `jsonSeguro()`, que
  também neutraliza `</script>` e os separadores de linha Unicode.
- **Busca no navegador**: usa `innerHTML`, mas com escapagem própria aplicada
  antes.

## Riscos residuais, honestamente

Nada disso é falha da ferramenta, mas muda como você a usa:

- **A wiki gerada contém a documentação inteira, em texto.** Ela herda a
  classificação de confidencialidade dos documentos de origem. Não publique
  `_site/` num servidor web achando que "é só uma wiki": trate a pasta como
  trata a `docs/`.
- **Quem escreve documento escreve conteúdo que outros vão abrir.** O XSS foi
  fechado, mas o Markdown continua permitindo link externo e imagem remota. Uma
  imagem remota num documento vaza para o servidor dela quem abriu a wiki e
  quando. Se isso importa no seu contexto, revise imagens externas no code
  review da documentação.
- **A ferramenta roda com as permissões de quem a executa.** Ela lê o que você
  declarou e escreve na pasta de saída, mas roda como você — como qualquer
  script do projeto.
- **`analisar` percorre o repositório** para propor as raízes. Não envia nada,
  mas o relatório impresso revela a estrutura de pastas: pense duas vezes antes
  de colar essa saída num chat externo ou num ticket público.
- **O runtime é o Node do seu ambiente.** A ferramenta não acrescenta
  superfície de ataque além do interpretador que você já usa, mas também não a
  reduz: mantenha o Node atualizado.
- **Regex do próprio config** (`perfil.eixo.padrao`) é compilada a cada
  documento. Uma expressão patológica trava seu build local. É sua config, no
  seu repositório — mas não copie regex de fonte desconhecida.

## Como instalar num projeto de trabalho

**A única forma usada aqui: copiar o código para dentro do repositório.** Nada
de registro de pacotes, nada de instalação, nada de `node_modules`, nada de
dependência de git presa a um commit remoto. A ferramenta vira código do seu
projeto, revisada no seu code review como qualquer outro arquivo.

```bash
mkdir -p ferramentas/doczilla
cp -r bin src templates package.json ferramentas/doczilla/
node ferramentas/doczilla/bin/doczilla.js analisar
```

O que isso significa na prática:

- A auditoria acontece uma vez, no pull request que traz a ferramenta.
- Ninguém consegue trocar a versão sem passar por revisão.
- Não há resolução de dependência em tempo de build — nada é baixado, nada é
  buscado num servidor de pacotes interno ou externo.
- Atualizar é um PR novo, com diff visível, copiando o código atualizado.

São cerca de 4.300 linhas de JavaScript sem dependências, das quais 581 são o
CSS e o JS do site gerado, guardados como template string. É auditável de
verdade, não no papel.

Só os devs rodam a ferramenta — ver
[FLUXO-DA-EQUIPE.md](FLUXO-DA-EQUIPE.md#só-dev-roda-a-ferramenta--o-resto-do-time-só-lê).
Quem não é dev nunca precisa saber que `ferramentas/doczilla/` existe: lê o
`docs/_site/` já pronto, versionado no mesmo repositório.

## Ajustes específicos para repositório Salesforce

Este projeto versiona `docs/_site/` (ver
[FLUXO-DA-EQUIPE.md](FLUXO-DA-EQUIPE.md#só-dev-roda-a-ferramenta--o-resto-do-time-só-lê)):
o site gerado entra no `git`, para quem não é dev ler sem instalar nada. Isso
muda o que cada arquivo de ignore precisa saber:

```bash
# .gitignore — NAO ignora docs/_site/. Ela é versionada de propósito.

# .forceignore — impede que a wiki seja empacotada num deploy para a org.
# Isso vale mesmo com o site versionado: HTML gerado nunca deve ir para o
# Salesforce, só para o git.
docs/_site/
**/_site/**
```

Se em vez disso sua equipe optar por manter `_site/` fora do git (publicando
por outro canal), inverta: acrescente `docs/_site/` também ao `.gitignore`.

O Doczilla nunca lê `force-app/` nem qualquer pasta de metadados: `analyze.js`
já ignora `force-app`, `sfdx-source`, `unpackaged`, `.sfdx` e `.sf`, e o build
só lê as raízes declaradas. Ainda assim, confira a lista de raízes propostas
antes de gravar o perfil — é para isso que `analisar` não escreve nada sozinho.

## Implantação por etapas

Sugestão de sequência, cada etapa reversível:

1. **Leitura, sem gravar nada.** Rode `analisar` num clone local e leia o
   relatório. A ferramenta não escreveu nada ainda.
   ```bash
   node ferramentas/doczilla/bin/doczilla.js analisar
   ```
2. **Perfil em branch.** Grave o perfil, gere o site, abra `_site/index.html`.
   Confira a tela **Mapa**: ela mostra exatamente quais pastas foram lidas.
   ```bash
   node ferramentas/doczilla/bin/doczilla.js analisar --escrever
   node ferramentas/doczilla/bin/doczilla.js build
   ```
3. **PR com o perfil, o hook e o `.forceignore`.** O que entra no repositório é
   a ferramenta, o arquivo de configuração, o hook de `pre-commit` (ver
   `templates/pre-commit`) e o site gerado na primeira vez. Nenhum
   documento é alterado — nem um.
4. **CI como rede de segurança.** Com `_site/` versionado, o CI não precisa
   gerar nada — só confirmar que o que está no `git` bate com os documentos:
   ```yaml
   - run: node ferramentas/doczilla/bin/doczilla.js build --verificar
   ```
   Isso cobre o caso em que alguém commita por fora do hook (interface web do
   git, hook desativado). Some `--strict` só quando quiser bloquear merge por
   aviso crítico — em projeto que está adotando aos poucos, comece sem: no
   regime descoberto o legado vira observação, não crítico.
5. **Distribuição.** Já está feita: quem tem acesso ao repositório dá `git
   pull` e abre `docs/_site/index.html` por duplo clique. Para quem não tem
   acesso ao repositório, isso não serve — distribua o zip da pasta
   pontualmente, lembrando que o conteúdo tem a mesma classificação dos
   documentos de origem.

## Reconferindo esta auditoria

```bash
grep -rn "fetch\|child_process\|eval(\|new Function" src/ bin/
```
