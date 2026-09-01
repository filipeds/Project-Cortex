# Como a equipe usa isto no dia a dia

O `DOCUMENTATION-GUIDE.md` diz **como escrever** um documento. Este arquivo diz
**quem escreve, quando, e o que muda na rotina** — que é a parte que decide se a
documentação sobrevive ao terceiro sprint.

## A ideia que organiza o resto

**Ninguém "usa o Doczilla".** A ferramenta não tem editor, não tem login, não
tem servidor. A equipe escreve arquivos `.md` no repositório, no mesmo pull
request do ticket, como sempre escreveu código. O Doczilla só lê essa pasta e
transforma em site.

Isso tem uma consequência prática importante: **a documentação vive onde o
código vive**. Ela é versionada junto, revisada no mesmo PR, e não fica num
Confluence que ninguém abre. Quem não tem acesso ao repositório também não
deveria ter acesso à documentação dele.

## Só dev roda a ferramenta — o resto do time só lê

Esta é a decisão deste projeto: **`docs/_site/` é versionado no repositório.**
Ninguém que não seja dev instala Node, roda comando ou entende os seis tipos.
PO, suporte, QA e quem mais tiver acesso de leitura ao repositório dão `git
pull`, abrem `docs/_site/index.html` por duplo clique, e leem — offline, sem
instalar nada.

O que isso exige de quem escreve: **rodar o build antes do commit**, para que a
`main` nunca acumule documento novo com HTML velho. Duas coisas tornam isso
seguro em vez de "confiar que ninguém esquece":

**O build é determinístico.** Rodar duas vezes sem mudar documento produz
arquivos idênticos — nada de carimbo de horário mudando à toa. Isso significa
que o diff do PR mostra exatamente as páginas afetadas pela edição, nunca o
site inteiro. Editar uma spec muda a página dela e a busca; o resto do site nem
entra no commit — na demonstração deste repositório (19 documentos), editar um
documento muda 2 dos 32 arquivos gerados.

**Um hook garante que ninguém esqueça.** `templates/pre-commit` roda
`doczilla build --verificar` antes de cada commit: se algum `.md` mudou e o
`_site/` não foi regenerado, o hook gera na hora e inclui no commit — sem
travar o fluxo, sem exigir que o dev lembre de um passo a mais.

```bash
# uma vez por clone
cp ferramentas/doczilla/templates/pre-commit ferramentas/hooks/pre-commit
chmod +x ferramentas/hooks/pre-commit
git config core.hooksPath ferramentas/hooks
```

E o mesmo comando serve de rede de segurança no CI, sem precisar publicar nada:

```yaml
- run: node ferramentas/doczilla/bin/doczilla.js build --verificar
```

Se um PR chegar com documento editado e `_site/` desatualizado — hook local
pulado, commit direto pela interface web, o que for — o CI falha com a lista
exata de arquivos fora de dia. É o mesmo comando dos dois lados: local avisa
cedo, CI garante.

## Três papéis

### Quem escreve — todo mundo que pega ticket

Escreve o `.md` dentro do PR do ticket. **Não roda comando nenhum** para isso
funcionar. Na prática, quase nunca escreve à mão: pede para a IA.

O que torna isso viável é uma linha no `CLAUDE.md` (ou `AGENTS.md`) do projeto:

```markdown
Ao criar ou editar documentação em `docs/`, siga `docs/DOCUMENTATION-GUIDE.md`
exatamente: frontmatter obrigatório, um dos seis tipos, e nada de inventar campo.
```

Feito isso uma vez, o pedido no dia a dia vira:

> "documenta o entendimento do ORI-1487 a partir da descrição do card"
> "escreve a entrega do ORI-1487 com o que eu mexi neste PR"

E o documento nasce no formato certo, com os campos certos, sem ninguém decorar
seis tipos e catorze campos. **Este é o mecanismo central da adoção.** Sem ele,
o padrão vira burocracia e morre em duas sprints.

### Quem lê — o time inteiro, e principalmente quem não escreveu

Abre `_site/index.html` e navega. Não instala nada, não roda comando, não
precisa de Node. É HTML: abre por duplo clique, funciona sem rede.

Quem mais ganha com isso não é quem escreveu — é o suporte tentando entender por
que a alçada é 15%, o PO conferindo o que foi acordado, e a pessoa que entra no
time em janeiro e precisa saber por que a decisão foi aquela.

### Quem mantém — uma pessoa, uma vez

Rodou `analisar` no começo, revisou o perfil, abriu o PR de adoção e configurou
o passo de CI. Depois disso, mexe no `doczilla.config.json` quando o projeto
ganha uma pasta nova de documentação. É trabalho de horas, não de sprint.

## Os três momentos

### 1. Durante o ticket — escrever

Os seis tipos não são categorias arbitrárias: são os momentos da vida de um
card. Cada um tem uma hora natural de nascer.

| Momento | Documento | Quem costuma escrever |
|---|---|---|
| Refinamento, antes de codar | `entendimento` | quem levantou o card |
| Antes ou durante o desenvolvimento | `spec` | dev ou analista |
| Quando houve decisão técnica com alternativa descartada | `arquitetura` | quem decidiu |
| Quando o bug aparece e é investigado | `bug` | quem investigou |
| No deploy | `entrega` | quem subiu |
| Quando uma regra atravessa vários cards | `regra` | quem descobriu a regra |

**Nem todo card tem os cinco.** Card pequeno tem spec e entrega. Bug de produção
tem só investigação. A wiki mostra quais faltam, mas isso é convite, não portão:
o build não falha por causa disso.

O que vale insistir: `entendimento` **antes** de codar e `entrega` **no** deploy.
Documento de entrega escrito duas semanas depois vira ficção — ninguém lembra o
que realmente subiu.

### 2. No pull request — revisar

A documentação entra no PR do ticket e é revisada como código. Duas perguntas
bastam no review:

- O `entendimento`/`spec` descreve o que o PR faz de verdade?
- A `arquitetura` explica **por que**, incluindo o que foi descartado?

Vale um item no template de PR:

```markdown
- [ ] Documentação atualizada em `docs/` (ou: este PR não muda comportamento)
```

O "ou" no final importa. Sem essa saída, o item vira caixinha marcada no
automático e perde o sentido.

### 3. Antes do commit — gerar

O `_site/` já vai atualizado no commit: o hook de `pre-commit` cuida disso
(ver [Só dev roda a ferramenta](#só-dev-roda-a-ferramenta--o-resto-do-time-só-lê)
acima). Quem está escrevendo e quer ver o resultado antes de commitar usa o
servidor local, que recarrega a cada salvamento:

```bash
node ferramentas/doczilla/bin/doczilla.js serve   # recarrega enquanto você escreve
```

Depois do merge, não há nada a "gerar": o HTML já chegou na `main` junto com o
documento, no mesmo commit. Quem lê dá `git pull` e abre
`docs/_site/index.html`.

## Se a equipe já tem documentação (o caso mais comum)

Ninguém migra nada. Esse é o ponto do regime descoberto.

**No dia 1**, depois de `analisar --escrever` e `build`, a wiki já existe com
tudo que o projeto acumulou — arquivos sem frontmatter inclusive. Eles aparecem
na navegação e na busca. Os links relativos que já estavam escritos viram
ligações e backlinks de verdade.

**A partir do dia 1**, o padrão só se aplica a documento **novo**. Ninguém
recebe uma tarefa de "migrar 200 arquivos" — essa tarefa nunca é priorizada e
serve só para a ferramenta ser rejeitada.

**O legado migra sozinho, aos poucos**, quando alguém já está mexendo naquele
arquivo por outro motivo. Acrescentar cinco linhas de frontmatter num documento
que você está editando de qualquer jeito custa trinta segundos. A tela **Mapa**
mostra o percentual subindo, e é ele que vira o indicador — não uma lista de
tarefas de migração.

Uma regra que vale combinar: **quando encostar num documento legado, coloque o
frontmatter.** Nada além disso.

## O que muda na rotina, concretamente

Pouca coisa — e essa é a intenção:

- **No refinamento:** o card só é considerado entendido quando existe o
  `entendimento` escrito. É o único ritual novo de verdade.
- **No PR:** um item a mais no template.
- **No deploy:** a `entrega` faz parte do checklist de subida.
- **No onboarding:** a primeira tarefa de quem chega é ler a wiki e abrir um PR
  corrigindo o que estiver errado nela. Ensina o produto e o padrão de uma vez.
- **Em nenhum momento:** ninguém precisa aprender a ferramenta.

## Como isso morre (e como evitar)

Vale nomear os modos de falha, porque são previsíveis:

- **Documentação escrita depois do deploy.** Vira ficção. O antídoto é o
  `entendimento` antes de codar e a `entrega` junto com a subida.
- **`_site/` fora de dia na `main`.** O modo de falha específico de versionar o
  HTML: alguém commita documento sem passar pelo hook (commit pela interface
  web, hook desativado). O CI com `build --verificar` é o que fecha essa
  brecha — sem ele, a rede de segurança depende só do hook local.
- **`--strict` no CI logo no começo.** Transforma adoção em bloqueio de merge e
  gera revolta. Em projeto que está adotando, o legado já sai como observação e
  o CI passa desde o primeiro dia — deixe `--strict` para quando o percentual de
  adoção estiver alto, se é que vale ligar.
- **Padrão negociado por documento.** "Neste eu vou usar um tipo diferente"
  corrói o formato até ele não valer nada. Os seis tipos são fixos justamente
  para que a instrução dada à IA continue valendo.
- **Documentação como tarefa separada no board.** Vira débito eterno. Ela é
  parte do ticket, entra no mesmo PR, ou não acontece.

## Resumo em uma tela

| Papel | Roda comando? | Frequência | O que faz |
|---|---|---|---|
| Quem pega ticket (dev) | sim — `serve` opcional, o hook cuida do resto | por card | escreve `.md` no PR, quase sempre pedindo à IA; commita com `_site/` já em dia |
| Quem revisa | não | por PR | confere se o documento bate com o que foi feito |
| Quem lê (PO, suporte, QA...) | não | sempre | `git pull`, abre `docs/_site/index.html` |
| Quem mantém | sim | raramente | perfil, config, hook e passo de CI |
| CI | sim | por PR | `build --verificar` — rede de segurança, não gera nada novo |
