---
title: Adopting existing documents
description: Move a directory of markdown files or a column of HTML into Quoin, knowing first what each conversion loses, then give the blocks ids that last, take documents back out, and check a whole corpus before you move it.
---

# Adopting existing documents

Documents rarely start in the editor. They are markdown files in a repository, HTML in a database column, or pages exported from another tool. `quoin-editor/engine` reads markdown and HTML into `QuoinBlock[]`, and writes blocks back out as markdown, HTML and plain text, with `quoin-editor/docx` for Word. The engine runs in Node with no React and no DOM, so a whole document set converts in a script before anybody opens the editor.

This page starts with what does not survive the move, because that is what decides whether to make it.

## What a markdown file loses

`fromMarkdown` reads CommonMark with GitHub's tables, task lists, strikethrough and alerts. Markup it has no block or formatting for mostly stays in the document as text, escaped so that it reads as it did in your file: the words survive, but the reader sees the markup instead of what it drew. These are the losses, the most common first.

| In your file | In the document |
| --- | --- |
| An image inside a line of text, such as a badge inside a link (`[![build](badge.svg)](https://ci.example)`), or two images in one paragraph | Its markdown, shown as text. Only an image alone in its paragraph becomes an image block |
| HTML other than the tags listed under [Inline HTML the document keeps](#inline-html-the-document-keeps), as a block (`<p align="center">`, `<div>`, `<a name="top"></a>`) or inside a line (`<kbd>`, `<img>`, `<a href>`, `<span style>`) | Its tags, shown as text. The lines of an HTML block join into one paragraph |
| An HTML comment, `<!-- note -->` | Shown as text |
| Front matter, the YAML block between `---` lines at the top of a file | A divider and a heading. Split it off before converting and keep it in fields of your own |
| Words after the language on a code fence's first line, such as `filename="app.js"` | Dropped; the language stays |
| A list inside a quote | Quote lines without their bullets or numbers. A nested level keeps an indent in the blocks, which a plain markdown export then flattens |
| A footnote, `[^1]`, and its note | Text, where each was written |
| A bare address, `https://example.com` or `www.example.com` | Text, not a link. An address in angle brackets, `<https://example.com>`, is a link |
| A loose list, with a blank line between items | A tight list |

Over 1,319 distinct README, changelog and documentation files taken from installed npm packages (472 of them the Next.js documentation), the conversion met an image inside text in 263 files, other HTML in 307, an HTML comment in 113, front matter in 484, words after a fence's language in 297, a list inside a quote in 100 and a bare address in 146. Where the first two matter, a pass over your files before converting can rewrite them, such as `<p align="center"><img src="logo.png" alt="Logo"></p>` into `![Logo](logo.png)`.

### Written differently, drawn the same

Everything else that changes is spelling: the markdown written back differs from yours, and the document draws the same.

- A paragraph's lines join into one line. That is `fromMarkdown`'s default, `softBreak: 'space'`; `softBreak: 'newline'` would make each line of a wrapped paragraph a line of its own, which draws differently.
- `*` and `+` bullets become `-`, `1)` becomes `1.`, and a numbered list counts up from its first number, so items numbered `1.`, `1.`, `1.` are written `1.`, `2.`, `3.`.
- `*emphasis*` becomes `_emphasis_` and `__strong__` becomes `**strong**`. `<b>`, `<strong>`, `<i>`, `<em>`, `<s>`, `<del>`, `<strike>` and `<code>` become their markdown.
- A heading underlined with `===` or `---` becomes a `#` heading, and a heading's closing `#`s go.
- Indented code and `~~~` fences become backtick fences, and `***` and `___` become `---`.
- A reference link, `[text][ref]`, becomes an inline link, and its definition goes.
- Entities are decoded (`&amp;` is written `&`, `&nbsp;` a no-break space), two trailing spaces or a `<br>` become a backslash line break, a table's delimiter row and padding are rewritten, and a character that could start markup is escaped: `2.0` at the start of a line is written `2\.0`, and `$5` is written `\$5`.
- Blank lines in a row become one, and spaces at the end of a line go.

### Inline HTML the document keeps

Markdown has no syntax for some of the editor's formatting, so a text block stores it as HTML, and `fromMarkdown` reads these tags from your files too. Each is kept only in this form, with no other attribute: `<u class="x">` is shown as text.

| HTML | Formatting |
| --- | --- |
| `<u>text</u>` | Underline |
| `<mark>text</mark>`, `<mark data-color="green">text</mark>` | Highlight, in the default colour or a palette colour |
| `<span data-color="red">text</span>` | Text colour |
| `<span data-bg="yellow">text</span>` | Background colour |
| `<sub>text</sub>`, `<sup>text</sup>` | Subscript and superscript |
| `<br>` | A line break inside the block |
| `<span data-comment="t1">text</span>` | The anchor of the comment thread `t1` |

A colour is one of the palette's names, `PALETTE` in `quoin-editor/engine`: default, gray, brown, orange, yellow, green, blue, purple, pink and red. Any other value, such as `<span data-color="#ff0000">`, is shown as text.

## What storing blocks as markdown keeps

A document kept as `QuoinBlock[]`, as JSON, keeps everything. A document written with `toMarkdown` and read again with `fromMarkdown` keeps what the engine's round-trip tests check, on generated documents of every block type and every kind of formatting:

| Written with | Read back |
| --- | --- |
| `toMarkdown(blocks, { lossless: true })` | Every block and every key of its data |
| `toMarkdown(blocks)`, the default | Every block that plain markdown can hold, with all of its formatting, the inline HTML above, mentions and inline math. A block type of your own and a table of contents are written as comments and read back whole |

The plain form does not hold the alignment, colour, background or other extra keys of a text block, a toggle or a divider, an empty paragraph or quote, an indent that no list item or toggle above it explains, a callout's icon or a tone other than the five alerts' (such a callout is written as a note), the absence of a header row (a table without one gains an empty one), or a line of only spaces in code inside a list item. A paragraph right under an empty list item reads back as that item's text. Files, embeds and bookmarks read back as links in a paragraph, and a picture stored by `storageKey` as the address `resolveAssetUrl` gave it.

Neither form holds ids: every read of markdown or HTML gives each block a new one.

## The way in

### A directory of markdown files

Read each file however your stack reads files, set its front matter aside, and convert the rest:

```ts
import { fromMarkdown, type QuoinBlock } from 'quoin-editor/engine';

const FRONT_MATTER = /^---\r?\n(?![ \t]*\r?\n)(?:.*\r?\n)*?(?:---|\.\.\.)\r?\n/;

export function readDocument(file: string): { frontMatter: string | null; blocks: QuoinBlock[] } {
  const frontMatter = FRONT_MATTER.exec(file)?.[0] ?? null;
  const markdown = frontMatter === null ? file : file.slice(frontMatter.length);
  return { frontMatter, blocks: fromMarkdown(markdown) };
}
```

A blank line right under the first `---` makes it a divider rather than front matter. Windows line endings read the same as Unix ones.

### A column of HTML

`fromHTML` reads HTML into blocks through a `DOMParser`. A browser has one; in Node, pass one, such as an instance of jsdom's `new JSDOM('').window.DOMParser`. Without one it throws.

```ts
import { fromHTML, type DOMParserLike, type QuoinBlock } from 'quoin-editor/engine';

export function readColumn(html: string, parser?: DOMParserLike): QuoinBlock[] {
  return fromHTML(html, { parser });
}
```

It keeps headings, paragraphs, bold, italic, underline, strike, inline code (`<kbd>` as code too), links, subscript, superscript and highlight, nested lists with their start numbers, task checkboxes, quotes, code with a `language-` class, images, with a `figcaption` as the caption, tables, dividers, `details` toggles and line breaks. An image inside a paragraph becomes an image block between the text before and after it. A `color` or `background-color` set inline in hex or `rgb()` becomes the nearest palette colour; a named colour such as `red` is dropped. Gone without a trace: iframes, video and audio, scripts and styles, comments, CSS classes and alignment. A definition list becomes a paragraph per term and per definition, and a link to an unsafe address such as `javascript:` keeps its text and loses the link.

HTML that `toHTML` wrote is an output, not a storage format: read back with `fromHTML`, a callout becomes a paragraph, math becomes code, a table loses its alignment and text colour and background are dropped. Keep `QuoinBlock[]` or markdown as the stored form.

### Ids that last

`fromMarkdown` and `fromHTML` give every block a fresh random id, and no export holds ids, so convert each document once and store the `QuoinBlock[]` with the ids it got. That array is the document from then on, and markdown is something you export from it, wherever anything outside the document refers to a block by its id:

- A collaboration room's shared document holds each block's id, and a collaborator's selection names blocks by id. Seed each room once, from the stored array: the first client to connect to an empty room fills it, so connect after the provider's first sync, or pass `seed: false` to all clients but one ([Collaboration](https://quoincloud.com/docs/editor/collaboration)).
- A comment anchor lives in the text itself, `<span data-comment="t1">`, so it survives a markdown export and a fresh conversion. The `blockId` that `onCreate` hands your thread store does not, if you keep it.
- `QuoinDiff` and `diffBlocks` pair blocks by id first, when at least half the ids of the shorter version are found in the other.

`newId` takes the place of the random ids, for ids that follow a scheme of your own, such as one your database already uses. Never derive an id from a block's position alone: two conversions of a file that gained a paragraph would give the same id to different blocks, and the diff view would compare the wrong ones.

### Review a conversion before you write it

When you convert again a document you already store, because its source changed or your conversion did, draw the two with `QuoinDiff` before writing the new one. The fresh conversion has new ids, so the two are paired by content, and a reviewer sees each block it adds, removes or changes:

```tsx
import { fromMarkdown, type QuoinBlock } from 'quoin-editor/engine';
import { QuoinDiff } from 'quoin-editor/diff';

export function ConversionReview({ stored, source }: { stored: QuoinBlock[]; source: string }) {
  return <QuoinDiff before={stored} after={fromMarkdown(source)} />;
}
```

`quoin-editor/diff` renders on a server or in plain Node as well as in the browser, so a review page can be drawn for every document of a batch. [Comparing two versions](https://quoincloud.com/docs/editor/server-rendering#comparing-two-versions) has the rest.

## The way out

```ts
import { toHTML, toMarkdown, toPlainText, type QuoinBlock } from 'quoin-editor/engine';

export function exportDocument(blocks: QuoinBlock[]) {
  return {
    markdown: toMarkdown(blocks),
    archive: toMarkdown(blocks, { lossless: true }),
    html: toHTML(blocks, { resolveAssetUrl: (key) => `/files/${key}` }),
    text: toPlainText(blocks),
  };
}
```

- `toMarkdown` writes native markdown, which keeps what the table above says. `lossless: true` writes each block that plain markdown cannot hold in full as a comment `fromMarkdown` reads back, `comments: false` leaves out the comment anchors, and `resolveAssetUrl` gives the address of a stored picture or file.
- `toHTML` writes the HTML `QuoinView` draws, with no React and no DOM.
- `toPlainText` writes the text alone, a line per block and a tab between table cells, with a picture's alt text and a file's name, for a search index or a word count.
- `toDocx` from `quoin-editor/docx` writes a Word file: [Exporting to Word](https://quoincloud.com/docs/editor/server-rendering#exporting-to-word) says what each block becomes.

## Validating a large corpus

Convert every file, write the blocks back as markdown, read that again, and compare. The [quoin-editor repository](https://github.com/AmineSeboui/quoin-editor) carries a script that does exactly that for a directory. From a clone of it:

```bash
npm ci
npm run build
npm run convert:markdown -- ~/notes --out ~/notes-converted --changes
```

It reads every `.md` and `.markdown` file under the directory, sets front matter aside, and sorts each file into one of three:

- **unchanged**: the markdown written back is the markdown read, apart from line endings and blank lines at either end;
- **changed**: the markdown written back differs, and reading it again gives a document that draws the same;
- **failed**: the conversion threw, or reading the written markdown again gives a document that draws differently, which is what storing it as markdown would lose. It names the first block that differs.

`--changes` adds the first line that differs in each changed file. `--out` writes, for each file, the markdown its blocks write back, with the front matter on top, under the file's own name, and the blocks beside it as JSON, so any diff tool can compare the two directories. The script exits with 1 when a file failed, so it can gate a migration in CI.

Over the 1,319 files above it took a few seconds: 166 came back unchanged, 1,152 changed and one failed, a list nested inside a quote, whose inner level a plain export flattens. Over this package's own 29 markdown files, its README, changelog, migration guide, community files and documentation pages, this one included, 21 came back unchanged, 8 changed and none failed.

The engine's own tests make the same check the other way round, on every change: generated documents of every block type and every kind of formatting are written as markdown and read back, which is what the table under [What storing blocks as markdown keeps](#what-storing-blocks-as-markdown-keeps) reports.
