# Obsidian Table to Base

Transforme uma tabela Markdown em notas organizadas e acompanhe tudo em uma
Base do Obsidian. Em vez de criar cada nota à mão, você planeja os itens numa
tabela e deixa o plugin preparar os arquivos para você.

## Um exemplo: organizar o semestre de uma disciplina

Imagine que você está preparando o semestre de uma disciplina. Pode listar
leituras, trabalhos, provas e outras atividades numa tabela dentro da nota da
disciplina:

| file_name | file_content | tipo | data | status | tags |
| --- | --- | --- | --- | --- | --- |
| Leitura - semana 1 | Ler o capítulo introdutório e anotar dúvidas. | Leitura | 2026-03-09 | Pendente | estudo |
| Trabalho - resenha | Preparar uma resenha do texto escolhido. | Trabalho | 2026-04-02 | Pendente | estudo, escrita |
| Prova parcial | Rever as anotações das primeiras semanas. | Prova | 2026-05-12 | Pendente | estudo |

Ao converter a tabela, cada linha vira uma nota. As colunas `tipo`, `data`,
`status` e `tags` são salvas como propriedades, e `file_content` vira o corpo
da nota. Assim, você pode abrir uma atividade para acrescentar anotações sem
perder a visão geral do semestre.

### O que será criado

Por padrão, os arquivos ficam organizados assim:

```text
Meu semestre.md                 ← a tabela é substituída pelo embed da Base
Meu semestre_base.base           ← define a tabela e filtra as notas pela tag
base_notes/
├── Leitura - semana 1.md
├── Trabalho - resenha.md
└── Prova parcial.md
```

O arquivo `.base` fica na raiz do vault; as notas são salvas em `base_notes/`
por padrão. A Base mostra as notas geradas para aquela organização. Se você
converter outra tabela na mesma nota, o plugin reutiliza a Base e marca as
novas notas com a mesma tag.

## Como converter

No editor, clique com o botão direito em uma célula da tabela e escolha
**Converter em base+notas**. Ou abra a paleta de comandos e execute
**Converter tabela do arquivo atual em base**. A paleta só converte quando
encontra exatamente uma tabela Markdown no arquivo; se encontrar mais de uma,
avisa que esse modo processa uma tabela por vez.

A tabela precisa ter uma coluna para o nome do arquivo e outra chamada
`file_content`. Por padrão, a coluna de nome é `file_name`.

| Coluna | Para que serve |
| --- | --- |
| `file_name` | Nome da nota gerada. O nome da coluna pode ser alterado nas configurações. |
| `file_content` | Texto que forma o corpo da nota. |
| Outras colunas | Propriedades no frontmatter da nota. |
| `tags` | Tags separadas por vírgulas; a tag da Base é acrescentada automaticamente. |

## Configurações

Nas configurações do plugin, você pode escolher:

- **Pasta de destino** das notas. O padrão é `base_notes`; deixe vazia para
  salvar na raiz do vault. Para criar a pasta em relação à pasta da nota atual,
  use `{{currentFolder}}`, por exemplo `{{currentFolder}}/base_notes`.
- **Coluna do nome do arquivo**. O padrão é `file_name`.
- **Tag da Base**. Se ficar vazia, será usado o nome da nota onde está a
  tabela.
- Se as propriedades podem ter **valores vazios**.
- **Idioma** da interface. Você pode escolher português ou inglês; no modo
  automático, o plugin acompanha o idioma do Obsidian.

O plugin não substitui notas existentes. Se um nome já estiver em uso, ele
acrescenta um sufixo, como `_2`. Se o arquivo `.base` da nota já existir, ele
será reutilizado.

## Instalação manual

1. Execute `npm ci` na pasta do projeto.
2. Execute `npm run build`.
3. Copie `main.js` e `manifest.json` para:
   `<Vault>/.obsidian/plugins/obsidian-table-to-base-plugin/`.
4. No Obsidian, recarregue os plugins e ative **Obsidian Table to Base** em
   **Configurações → Plugins da comunidade**.

As traduções são incluídas em `main.js` durante o build; não é preciso copiar
os arquivos da pasta `src/`.

## Desenvolvimento

Requisitos: Node.js 18 ou superior e npm.

```bash
npm ci
npm run dev
```

`npm run dev` recompila o plugin enquanto você edita os arquivos. Para
validar as alterações:

```bash
npm run build
npm run lint
```

O código-fonte fica em `src/`. O build gera `main.js` na raiz; esse arquivo é
artefato gerado e não deve ser versionado.

## Publicação

1. Atualize a versão SemVer em `manifest.json`.
2. Atualize em `versions.json` a versão e o `minAppVersion` correspondente.
3. Rode `npm run build` e `npm run lint`.
4. Crie uma tag Git igual à versão, sem o prefixo `v`.
5. Anexe `main.js` e `manifest.json` à release.

Consulte as
[diretrizes de plugins do Obsidian](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
antes de publicar.
