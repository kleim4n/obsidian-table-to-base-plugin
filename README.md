# Table to Base

Turn a Markdown table into organized notes and track them in a Base. Instead
of creating each note by hand, plan your items in a table and let the plugin
prepare the files for you.

## Example: organize a course semester

Suppose you are preparing a course semester. List readings, assignments,
exams, and other activities in a table inside the course note:

| name | content | type | date | date_type | done | done_type | tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Reading - week 1 | Read the introductory chapter and note questions. | Reading | 2026-03-09 | date | false | checkbox | study |
| Essay | Prepare an essay on the selected text. | Assignment | 2026-04-02 | date | null | bool | study, writing |
| Midterm | Review notes from the first few weeks. | Exam | 2026-05-12 | date | false | check box | study |

When you convert the table, each row becomes a note. The `type`, `date`,
`done`, and `tags` columns are saved as properties, while `content` becomes
the note body. The `done_type` column declares the type of the `done`
property; `checkbox`, `bool`, and `check box` are accepted for checkboxes.
You can open an activity to add notes without losing the overview of the
semester.

### What gets created

By default, the files are organized like this:

```text
My semester.md                  <- the table is replaced by a Base embed
My semester_base.base           <- defines the table and filters notes by tag
base_notes/
|-- Reading - week 1.md
|-- Essay.md
`-- Midterm.md
```

The `.base` file is created at the vault root; notes are saved in `base_notes/`
by default. The Base shows the notes generated for that plan. If you convert
another table in the same note, the plugin reuses the Base and applies the
same tag to the new notes.

## Convert a table

In the editor, right-click a table cell and select **Convert to base+notes**.
Or open the command palette and run
**Convert the table in the current file to a base**.
The command palette converts only when it finds exactly one Markdown table in
the file. If there is more than one, it tells you that this mode supports one
table at a time.

The table must have a column for the note name and another named `content`.
The default name column is `name`.

| Column | Purpose |
| --- | --- |
| `name` | Name of the generated note. You can change the column name in settings. |
| `content` | Text used as the note body. |
| Other columns | Properties in the note's frontmatter. |
| `tags` | Comma-separated tags; the Base tag is added automatically. |
| `<property>_type` | Declares the type of the matching property. This helper column is not itself a property. |

Supported types: `text`, `list`, `number`, `bool`, `checkbox`, `date`,
`date & time` (or `datetime`), and `tags`. Use `true`, `false`, or `null` for
boolean values. A property must use the same type in every row. Lists can be
comma-separated or written as JSON; dates must use ISO format, such as
`2026-03-09`.

Use `{{date:FORMAT}}` in **Output folder** and in the `name` column to insert
the current date and time. For example, `{{date:YYYY}}/{{date:MM}}` creates
year/month folders, while `Activity {{date:YYYY-MM-DD}}` adds the date to the
note name. Formats follow Moment.js syntax.

## Settings

In the plugin settings, you can choose:

- **Output folder** for notes. The default is `base_notes`; leave it empty to
  save notes at the vault root. To create the folder relative to the current
  note, use `{{currentFolder}}`, for example `{{currentFolder}}/base_notes`.
- **File name column**. The default is `name`.
- The `content` column provides the note body.
- **Base tag**. If left empty, the name of the note containing the table is
  used.
- Whether properties can have **empty values**.
- The interface **Language**. Choose English or Portuguese, or use automatic
  mode to follow Obsidian's language.

The plugin does not overwrite existing notes. If a name is already in use, it
adds a suffix such as `_2`. If the note's `.base` file already exists, it is
reused.

## Manual installation

1. Run `npm ci` in the project folder.
2. Run `npm run build`.
3. Copy `main.js` and `manifest.json` to:
   `<Vault>/.obsidian/plugins/table-to-base/`.
4. In Obsidian, reload plugins and enable **Table to Base** under
   **Settings → Community plugins**.

Translations are bundled into `main.js` during the build; you do not need to
copy files from `src/`.

## Development

Requirements: Node.js 18 or later and npm.

```bash
npm ci
npm run dev
```

`npm run dev` rebuilds the plugin as you edit files. To validate changes:

```bash
npm test
npm run build
npm run lint
```

Source code is in `src/`. The build generates `main.js` in the project root;
this generated file should not be committed.
