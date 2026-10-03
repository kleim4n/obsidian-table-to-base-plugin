# Markdown Table to Obsidian Bases

Plugin para Obsidian que transforma uma tabela Markdown em notas individuais
e em uma visualização do tipo Base.

## Como converter uma tabela

No editor, clique com o botão direito em uma célula da tabela e selecione
**Converter em Base+Notas**. A tabela precisa ter as colunas `file_name` e
`file_content`:

| file_name | file_content | status |
| --- | --- | --- |
| Primeira nota | Conteúdo da nota | Rascunho |

- `file_name` define o nome de cada arquivo Markdown.
- `file_content` define o corpo da nota.
- Todas as outras colunas viram propriedades do frontmatter.
- Nomes de arquivo repetidos recebem sufixos numéricos, como `_2`.
- As notas são criadas na pasta `base_notes/` na raiz do vault.
- O arquivo `.base` é criado na raiz do vault, com o nome da nota atual
  seguido de `_base`.
- A Base filtra as notas criadas para aquela tabela.
- A tabela original é substituída por um embed da Base.

O plugin não sobrescreve notas existentes: se um nome já estiver em uso,
escolhe o próximo sufixo disponível. Se o arquivo `.base` de destino já
existir, a conversão para e informa o conflito. Os nomes são sanitizados para
remover caracteres inválidos em nomes de arquivos.

## Instalação manual

1. Execute `npm ci` na pasta do repositório.
2. Execute `npm run build`.
3. Copie `main.js` e `manifest.json` para:
   `<Vault>/.obsidian/plugins/md-table-2-obsidian-base-plugin/`.
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
