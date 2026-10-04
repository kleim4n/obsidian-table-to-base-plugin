# Obsidian Table to Base

Plugin para Obsidian que transforma uma tabela Markdown em notas individuais
e em uma visualização do tipo Base.

## Como converter uma tabela

No editor, clique com o botão direito em uma célula da tabela e selecione
**Converter em base+notas**, ou execute **Converter tabela do arquivo atual em
base** pela paleta de comandos. A ação da paleta funciona apenas quando o
arquivo contém exatamente uma tabela Markdown; se encontrar mais de uma,
informa que esse modo processa uma tabela por vez. A tabela precisa ter a coluna de nome do arquivo
(`file_name` por padrão) e a coluna `file_content`:

| file_name | file_content | status |
| --- | --- | --- |
| Primeira nota | Conteúdo da nota | Rascunho |

- `file_name` define o nome de cada arquivo Markdown por padrão. A coluna pode
  ser alterada nas configurações do plugin.
- `file_content` define o corpo da nota.
- Todas as outras colunas viram propriedades do frontmatter.
- Uma coluna `tags` aceita tags separadas por vírgulas; a tag usada pela Base é
  acrescentada automaticamente.
- Nomes de arquivo repetidos recebem sufixos numéricos, como `_2`.
- Por padrão, as notas são criadas na pasta `base_notes/` na raiz do vault.
- A pasta de destino, a coluna do nome do arquivo, a tag da Base e a permissão
  para valores vazios podem ser configuradas nas opções do plugin. O idioma
  também pode ser escolhido; sem uma seleção, o idioma do Obsidian é usado.
  A tag fica vazia por padrão e usa o nome da nota atual.
- O arquivo `.base` é criado na raiz do vault, com o nome da nota atual
  seguido de `_base`.
- A Base encontra as notas pela tag e pasta. Converter outra tabela da mesma
  nota reutiliza o arquivo `.base` e aplica a mesma tag às novas notas.
- A tabela original é substituída por um embed da Base.

O plugin não sobrescreve notas existentes: se um nome já estiver em uso,
escolhe o próximo sufixo disponível. Se o arquivo `.base` de destino já
existir, ele é reutilizado. Os nomes são sanitizados para remover caracteres
inválidos em nomes de arquivos.

## Instalação manual

1. Execute `npm ci` na pasta do repositório.
2. Execute `npm run build`.
3. Copie `main.js` e `manifest.json` para:
   `<Vault>/.obsidian/plugins/obsidian-table-to-base-plugin/`.
4. No Obsidian, recarregue os plugins ou reinicie o aplicativo.
5. Ative o plugin em **Configurações → Plugins da comunidade**.

Não é necessário copiar `README.md`, `node_modules` ou `styles.css`.

## Desenvolvimento

Requisitos: Node.js 18 ou superior e npm.

```bash
npm ci
npm run dev
```

`npm run dev` recompila o plugin quando os arquivos de origem mudam. Para
validar antes de enviar alterações:

```bash
npm run build
npm run lint
```

O código-fonte fica em `src/`. O build gera `main.js` na raiz, mas esse arquivo
é artefato gerado e não deve ser versionado; anexe-o a uma release junto com
`manifest.json`.

## Publicação de uma versão

1. Atualize a versão SemVer em `manifest.json`.
2. Adicione ou atualize a correspondência da versão para `minAppVersion` em
   `versions.json`.
3. Rode `npm run build` e `npm run lint`.
4. Crie uma tag Git igual à versão, sem prefixo `v`.
5. Na release do GitHub, anexe `main.js` e `manifest.json`.

Consulte as [diretrizes de plugins do Obsidian](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
antes de publicar.
