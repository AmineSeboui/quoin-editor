---
title: Opt-in features
description: Tables, embeds and bookmarks, math, tables of contents, mentions, emoji, find and replace and document stats, each an entry of its own that a page loads only when it imports it.
---

# Opt-in features

Features beyond the core blocks ship as their own entries, so a host that leaves one out never downloads it. Add a feature's extension to `extensions`, or `catalogue()` from `quoin-editor/catalogue` for all of them, each taking its options under its own name (`catalogue({ table: { labels } })`, or `false` to leave one out). Every string a feature shows or speaks comes from its own `labels` option, English by default, the name its blocks go by in their block menu and while one is selected as a whole included. A feature's options go through `catalogue({ <name>: options })` when you use the catalogue, and the feature is never added again beside it, which would mount it twice. Extensions are read when the canvas mounts: keep host functions stable or read changing values through a ref, and remount the canvas with a `key` to change options or labels.

A block whose feature is not installed, such as a table on a canvas without `tableExtension()`, an embed without `embedExtension()`, a math block without `mathExtension()` or a table of contents without `tocExtension()`, is drawn as an unsupported block. Its data is kept as it was, through edits around it, `onChange` and markdown. A math formula in a line, without `mathExtension()`, shows its LaTeX as plain text, and a mention, without `mentionExtension()`, shows `@` and its label as plain text.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { tableExtension } from 'quoin-editor/table';
import 'quoin-editor/styles.css';

const extensions = [tableExtension({ labels: { table: 'Tableau', deleteRow: 'Supprimer la ligne' } })];

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

## Tables

`quoin-editor/table` draws `TABLE` blocks as native tables, with a header row of column headers when the block has one, and every cell typed in place. `/table` inserts a 3 by 3 table. Tab and Shift+Tab move to the next and the previous cell, and Tab in the last cell adds a row. Enter in an empty cell of the last row adds a row, and elsewhere breaks the line. The arrows move between rows from the first and last lines of a cell. A table wider than the line scrolls inside its block, and the cell the caret moves into is brought into view.

The handles of a row and of a column open menus that insert, move and delete rows and columns, align a column and turn the header row on and off. Alt+F10 from a cell reaches them, the arrows move between them, Tab goes on to the border of the column, and Escape goes back to the caret. An open menu stays open while a collaborator types in its row or column, and closes when a change from elsewhere moves that row or column, or changes it together with another one. A + on the edge between two rows or two columns inserts one there; the same inserts are in the menus. A column border is a separator: drag it, or press the arrows on it, to set the width of the column, kept in pixels in `widths`. A drag across cells selects them as a range, which Backspace and Delete empty, a key typed or text pasted replaces, and the formatting shortcuts format whole. A read-only canvas draws the table and nothing to edit.

The engine commands, such as `insertTable`, `addRow` and `setColumnWidth`, and the cell selection plugin are exported from `quoin-editor/table` too.

## Embeds and bookmarks

`quoin-editor/embed` draws `EMBED` blocks as the frame of the provider that frames their address, and `BOOKMARK` blocks as cards that link to their page. The built-in providers are YouTube (`youtube.com/watch?v=`, `youtu.be/` and shorts, framed from `youtube-nocookie.com`), Vimeo, Loom, Figma, CodePen, Spotify and SoundCloud, the same ones `toHTML` frames. Every frame, on the canvas and in `toHTML` with `embeds: 'iframe'`, is https only, with `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"`, `loading="lazy"` and `referrerpolicy="strict-origin-when-cross-origin"`. The canvas titles each frame after its provider and draws it at the ratio of a video (Spotify and SoundCloud players at their own heights); `toHTML` titles it with the name of its provider, or with what its `frameTitle` option makes of that name. An `EMBED` whose address no provider frames is drawn as a link card instead.

```tsx
import { embedExtension } from 'quoin-editor/embed';

const extensions = [
  embedExtension({
    // Tried before the built-in providers, as `toHTML`'s `embedProviders` are.
    providers: [{ name: 'acme', match: (url) => (url.hostname === 'video.acme.test' ? `https://embed.acme.test${url.pathname}` : null) }],
    // Asked once for a bookmark with no title; the title, description and https picture it finds are written to the block.
    unfurl: (url) => fetch(`/api/unfurl?url=${encodeURIComponent(url)}`).then((response) => response.json()),
  }),
];
```

A link pasted alone on an empty line stays a link, and a toolbar beside it offers Embed (when a provider frames it), Bookmark or Keep as link. It never takes focus: Alt+F10 moves into it, the arrows walk it, and Escape, a press elsewhere or any edit keeps the link. Choosing Embed or Bookmark puts the block in place of the link, and one undo brings the link back. `/embed` and `/bookmark` ask for the link: Enter places it, Escape asks no more, and a press outside places a valid link.

On an editable canvas a press on an embed selects the block rather than the frame, which is out of the tab order; Enter on the selected embed moves focus into the frame. A read-only canvas draws the frames as they are, in the tab order. Without `unfurl`, a bookmark shows its address and domain, as it does when `unfurl` finds nothing; an `unfurl` that throws or rejects is reported to the canvas's `onError`, and is not asked again for that bookmark and address. Every string a bookmark holds is drawn as text, and its picture only from an http or https address.

## Math

`quoin-editor/math` draws `MATH` blocks, and the math formulas in a line, through the host's `renderMath(latex, { displayMode })`: in display mode for a block, inline for a formula. The HTML `renderMath` returns is trusted, and the canvas inserts it as it is, so it has to come from a renderer such as KaTeX or MathJax. Without `renderMath`, or when it throws or returns anything but a string with something in it, the LaTeX shows as monospace text. `toHTML` takes the same function as its own `renderMath` option.

```tsx
import { mathExtension } from 'quoin-editor/math';

// Stands for `import katex from 'katex'`.
declare const katex: { renderToString(latex: string, options: { displayMode: boolean; throwOnError: boolean }): string };

const extensions = [
  mathExtension({
    renderMath: (latex, { displayMode }) => katex.renderToString(latex, { displayMode, throwOnError: false }),
  }),
];
```

`$$` and a space at the start of a paragraph, or `/` and Block equation, make a math block and open its editor, a popover with the LaTeX and a live preview. A click on a math block, or Enter on one selected as a whole, opens it too: Mod+Enter or Save stores the LaTeX, Enter starts a new line, and Escape keeps what was there, each handing focus back to the block. A formula typed between dollars, such as `$x^2$`, becomes a formula in the line as its closing dollar is typed, wherever the markdown reads one, so `$5 and $10` stays text; Backspace right after gives the dollars back. A dollar in code never opens or closes a formula, and no formula runs across the edge of a link or of other formatting. A formula typed between backticks, such as `` `$x$` ``, stays a formula inside the code, because it converts before the closing backtick makes the code. Backspace right after a formula selects it, and a second Backspace deletes it; Shift with an arrow steps a selection over it whole, and a drag or a Shift+click that ends on it takes it whole. A click on a formula, or Enter while it is selected, opens the same editor, where Enter stores and Shift+Enter starts a new line, and Inline equation in the `/` menu opens it at the caret, writing the formula there once a LaTeX is stored and leaving the text as it was otherwise; Enter with the caret after a formula starts a new line as anywhere else, and Shift+click extends the selection. A press outside the editor, or Tab out of it, stores the LaTeX too, and a press leaves focus where it lands. Storing an empty formula removes it, and an empty block shows "Empty equation". Each store is one undo step. A read-only canvas draws blocks and formulas and opens no editor.

## Table of contents

`quoin-editor/toc` draws `TOC` blocks as a navigation named "Table of contents" that lists the headings of the document as links, nested by level, and follows them as they are written. A heading with no text is left out, and a skipped level nests one deep, as in the table of contents `toHTML` writes. `/` and Table of contents inserts one; with no headings it shows "Add headings to build the table of contents". A second table of contents in the same document, and any after it, is named with its number, "Table of contents 2", so that each navigation has a name of its own.

Each entry links to `#block-<id>`, the fragment a copied link to the block ends with. A click on an entry, or Enter on it, puts the caret at the end of its heading and scrolls the heading into view, smoothly unless the reader prefers reduced motion; Mod+click and a middle click leave the link to the browser, which opens the page at the heading in a new tab. On an editable canvas the arrows, or a press beside the entries, select the block as a whole, Enter then moves focus to its first entry, Tab and Shift+Tab walk the entries and go back to the block past either end, and Escape goes back to the block; the entries stay out of the page's tab order. A read-only canvas keeps them in it, and a click moves focus to the heading without changing the document. When a change from elsewhere moves the heading of the focused entry, focus follows its entry, and when it takes the heading away, focus goes back to the block.

`headings(doc, { schema })` lists the headings the block shows, each with its `blockId`, its `anchor` in the HTML of `toHTML` (`h-<blockId>`), its `level` and its plain `text`, for a table of contents of the host's own. Without `schema` it reads the core blocks and atoms, as `countDoc` does:

```tsx
import type { Editor } from 'quoin-editor';
import { headings } from 'quoin-editor/toc';

export const outline = ({ state }: Editor) => headings(state.doc, { schema: state.schema }).map(({ text }) => text);
```

## Mentions

`quoin-editor/mention` draws the mentions in a line, `[@Ada](mention:42)` in the markdown or `[@Ada](mention:user:42)` with a kind, as chips that read `@` and the label, with the kind in `data-kind`. `@` typed at the start of a line or after a space opens a menu of what the host's `search` finds for the text typed after it, spaces included. It asks once typing has rested for 120 ms, says it is searching until the answer comes, drops an answer to a query typed past, and shows "No matches" when the host finds nothing or when its search throws or rejects, which reaches `onError`. The arrows walk the results, Enter or Tab puts the chosen one in place of the `@` and the query, followed by a space, and one undo brings the query back; Escape closes the menu and keeps the text, and so does a space typed right after the `@` or once nothing matches. The menu shows the first 50 results, leaving out those with no label and repeats of a kind and id. A result's label and description are drawn as text, its avatar only from an http or https address, and a field that is not a string is left out. Where a `/` or another trigger opens after the `@`, its menu takes over until it goes.

```tsx
import { mentionExtension } from 'quoin-editor/mention';

const extensions = [
  mentionExtension({
    search: (query) => fetch(`/api/people?q=${encodeURIComponent(query)}`).then((response) => response.json()),
    onOpen: (mention) => window.open(`/people/${encodeURIComponent(mention.id)}`),
  }),
];
```

Backspace right after a chip selects it, and a second Backspace deletes it; Shift with an arrow steps a selection over it whole. With `onOpen`, a click on a chip, or Enter while it is selected, hands its mention (`id`, `label` and `kind`) to the host, once for a double click. On a read-only canvas the click does too, and each chip is a button in the tab order that Enter and Space open. A chip is never a link: without `onOpen` it is text. Without `search`, `@` opens nothing, and a read-only canvas opens no menu.

## Emoji

`quoin-editor/emoji` adds a `:` menu and an emoji picker, drawn from a dataset of about 1,900 emoji in their base forms, with their GitHub shortcodes and their tags, generated from [emojibase](https://emojibase.dev). The dataset is a chunk of its own, under 60 kB gzip, which the entry loads the first time the menu or the picker opens: neither the main entry nor `quoin-editor/emoji` holds it.

`:` typed at the start of a line or after a space, then two characters with no space, opens a menu of the eight best matches: an emoji whose shortcode is the query, then those with a shortcode that starts with it, then with a tag that starts with it, then with a shortcode or a tag that holds it. A `:` inside a word, as in a time (`10:30`) or a web address (`https://`), opens nothing. The arrows walk the matches, Enter or Tab puts the chosen emoji in place of the `:` and the query, as text, and one undo brings the query back; Escape closes the menu and keeps the text. The menu says it is loading the emoji until they come. When they cannot be loaded it says so, the error reaches `onError`, and the menu tries again the next time it opens.

The block menu of a callout gains Choose icon, which opens a picker of every emoji under a search field, a grid for each group, or a grid of what the search finds, best first. The arrows, Home and End walk the cells, Enter or a click writes the emoji to the icon of the callout in one undo step, and Escape closes the picker; either hands focus back to the callout. A press outside closes it too, and leaves focus where the press puts it. The six icons of the callout's own Icon menu stay as they are. On a read-only canvas `:` opens nothing, and there is no block menu.

```ts
import { emojiExtension, loadEmojiData } from 'quoin-editor/emoji';

const extensions = [emojiExtension({ labels: { chooseIcon: 'Pick an icon' } })];

// Loads the dataset once, however often it is called.
export async function emojiOf(shortcode: string): Promise<string | undefined> {
  const { emojiByShortcode } = await loadEmojiData();
  return emojiByShortcode(shortcode)?.emoji;
}
```

`loadEmojiData()` resolves to `searchEmoji(query, limit?)`, which ranks as the menu does and finds every emoji for an empty query, `emojiByShortcode(code)`, and `skinTones`, the five skin tone modifiers from light to dark.

## Find and replace

`quoin-editor/find` adds a find and replace panel, which Mod+Shift+F opens from the canvas, read-only or not. The query starts as the selected text when the selection lies inside one line, and focus goes to it. Every match in the text of the document is marked, in paragraphs, headings, list items, quotes, callouts, table cells and captions alike: formatting never breaks a match, and a formula or a mention stands between matches. Match case, Whole word (letters, digits and underscores of any script) and Regular expression are toggle buttons; a pattern that cannot be read says so instead of finding anything. The panel counts the matches, up to 1,000, and announces the count once typing rests.

Enter and Shift+Enter in the query move to the next and the previous match, wrapping, and bring it into view without taking focus from the panel. Replace, or Enter in the replacement field, replaces the current match and moves on; Replace all replaces every match in one undo step. Each replacement takes the formatting of the start of the match it replaces, and in regex mode `$&` and `$1` to `$9` stand for the match and its groups. The panel is not modal: the canvas stays editable and the marks follow each edit. Escape, or its close button, closes it and selects the current match, or puts the caret back where it was. A read-only canvas finds without replacing.

```tsx
import { findExtension, findMatches } from 'quoin-editor/find';

const extensions = [findExtension({ labels: { findAndReplace: 'Rechercher et remplacer' } })];
```

`findMatches(doc, query, { caseSensitive, wholeWord, regex })` returns `{ matches }`, each `{ block, region, from, to }` in document order, or `{ error }` for a pattern that cannot be read, and never throws. `replaceMatches(search, matches, replacement)` is the command that replaces them in one transaction.

## Stats, a character limit, focus mode and typography

`quoin-editor/stats` shows the words, characters and blocks of the document under it, counted again at most once per animation frame and each block only when it changed. It counts what was written: the text of every block as `countText` reads it, except that the cells of a table count without the separators between them, and an image, a file, an embed or a bookmark counts nothing, since its name, address or title comes from an upload or the host. Its other parts are off until asked for:

- `limit`: the most characters the document may hold, counted as the footer counts them, so attaching an image, a file, an embed or a bookmark never counts against it, and an upload or an unfurl that lands at the limit is written. An edit that would leave more than the limit, and more than there were, is refused whole, a paste, a drop or a composition included, and the reason is announced once; a deletion always goes through, so a document loaded over the limit can still be edited down. The footer then shows the count against the limit, as a polite live region from 90 percent of it. Undo, redo and the blocks the host supplies are never refused.
- `focusMode`: dims every block but those the selection touches, and the blocks they are nested in, to 40 percent while the canvas is editable and holds focus. The dimmed text falls below 4.5:1 contrast by design while it is dimmed, and nothing is hidden from assistive technology.
- `typography`: turns quotes, ellipses, arrows and the like into their typographic forms as they are typed; `{ dashes: 'em' }` or `'en'` turns a double hyphen into a dash too. Nothing is turned inside a formula or a code span still being typed: after a `$` that opens a formula, or a run of backticks that opens a code span, with nothing yet to close it, `$f'(x)$` keeps its prime and `` `a -> b` `` its arrow.

```tsx
import { statsExtension, useEditorStats } from 'quoin-editor/stats';

const extensions = [statsExtension({ limit: 280, focusMode: true, typography: { dashes: 'em' } })];
```

`footer: false` leaves the footer out and keeps the rest. `useEditorStats(controller)` returns `{ characters, words, blocks }` for a count of your own, with the controller of a `BlockCanvas` handle or, inside the canvas, of `useViewController()`.

## Writing an extension

Every feature above is an extension, and a host's own is built the same way, with `defineExtension` from `quoin-editor/engine` and passed in `extensions`. An extension has a `name`, and may add block types (`blocks`), marks, atoms, input and paste rules, a `keymap`, `commands`, `plugins` and `decorations`, react to each transaction (`onTransaction`), refuse one (`filterTransaction`), or run when the editor mounts (`onMount`); `src/engine/extension/types.ts` declares each field. Its `ui` field, an `ExtensionUI` from the main entry, adds to the canvas: slash menu items, bubble toolbar buttons, block menu items, block renderers and their names, and overlays drawn over the canvas. Define `ui.renderers` and its components at module level: a component declared inside a render is a new type each time, and every block it draws is mounted again.
