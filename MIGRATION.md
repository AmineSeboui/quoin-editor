# Migrating from 0.4 to 1.0

Quoin 1.0 keeps the 0.4 document format and the `BlockCanvas` contract, and replaces everything under them: the card and textarea of each block give way to an editor of Quoin's own that types into the page in place. Most hosts upgrade by changing the version and reading the list below; the [checklist](#checklist) at the end sums it up. Every change is listed in the [changelog](CHANGELOG.md).

```bash
npm install quoin-editor@^1
```

React 18.2 or 19 and TypeScript 5.4 or later, as in 0.4.

## Data

### No migration is needed

A document is still a `QuoinBlock[]` of `{ id, type, data }`, and every key of the five 0.4 block types keeps its name and meaning (`MarkdownBlockData`, `CalloutBlockData`, `CodeBlockData`, `ImageBlockData` and `FileBlockData`). Store and load the same arrays. 1.0 adds optional keys, listed [below](#new-optional-keys). Blocks nobody edits are handed back by `onChange` as the very objects you supplied, so a stored 0.4 document is never rewritten by being opened. The one exception is a block whose id repeats another's: it gets a fresh id.

### Multi-paragraph markdown blocks split on their first edit

A 0.4 `MARKDOWN` block could hold a whole page: several paragraphs, a list, a table. A 1.0 text block holds one line: a paragraph, a heading, a list item, a task or a quote. A 0.4 block of several lines is drawn line by line and kept as it is until someone edits it. On that first edit it is split: the first line keeps the block's id, the others take ids derived from it (`<id>-2`, `<id>-3` and on, skipping any id the document already has), a table becomes a `TABLE` block and an image alone on its line an `IMAGE` block. Each piece is written back as the canonical markdown of its line, so a host that diffs stored strings sees those blocks change once.

```ts
import type { QuoinBlock } from 'quoin-editor';

// Before the first edit, exactly as stored in 0.4.
export const stored: QuoinBlock[] = [{ id: 'a', type: 'MARKDOWN', data: { markdown: '# Notes\n\nFirst point\n\n- one\n  - nested' } }];

// What onChange reports once the heading has been edited.
export const edited: QuoinBlock[] = [
  { id: 'a', type: 'MARKDOWN', data: { markdown: '# Notes!' } },
  { id: 'a-2', type: 'MARKDOWN', data: { markdown: 'First point' } },
  { id: 'a-3', type: 'MARKDOWN', data: { markdown: '- one' } },
  { id: 'a-4', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 1 },
];
```

### The `indent` field

`QuoinBlock` gains an optional `indent`, the nesting depth shared by every block type: a nested list item, or a block inside a toggle. It is written only when it is above 0. Code that copies, validates or stores blocks should keep it.

### New optional keys

1.0 writes keys that 0.4 never wrote, each only once a writer uses what it holds:

| Type | New keys in `data` |
| --- | --- |
| `MARKDOWN` | `align` (`'left'`, `'center'`, `'right'` or `'justify'`), `color` and `background` (palette colour names) |
| `CALLOUT` | `icon`, the emoji the writer picked |
| `IMAGE` | `url` (an image embedded by address), `align` and `widthPercent` |
| `FILE` | `mime`, the type the uploaded file declares |

The block itself may carry `indent`, and documents may hold the new block types `DIVIDER`, `TOGGLE`, `TABLE`, `EMBED`, `BOOKMARK`, `MATH` and `TOC`. A host whose schema rejects unknown keys or types would reject a paragraph that was aligned, or an image that was resized. Add the keys above as optional, or let unknown keys through: in zod, `.passthrough()` (zod 3) or `.loose()` (zod 4) on the `data` schema; in JSON Schema, `"additionalProperties": true`.

### Captions and callout bodies are inline markdown

An image's `caption` and a callout's `body` were plain text in 0.4. In 1.0 they are typed in place and stored as inline markdown, like a paragraph. A 0.4 caption such as `A **sleepy** cat` now shows "sleepy" in bold, and `&amp;` shows as `&`. To keep a character literal in stored data, escape it with a backslash (`\*\*`); text typed in the canvas is escaped for you.

### Named HTML entities

Numeric character references (`&#233;`, `&#xE9;`) are always decoded. Of the named entities, only the 23 most common are: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;`, `&copy;`, `&reg;`, `&trade;`, `&hellip;`, `&mdash;`, `&ndash;`, `&lsquo;`, `&rsquo;`, `&ldquo;`, `&rdquo;`, `&laquo;`, `&raquo;`, `&times;`, `&divide;`, `&deg;`, `&middot;` and `&bull;`. Any other, such as `&eacute;`, stays literal text, and is written back escaped (`\&eacute;`) once its block is edited. The full HTML5 table would add about 10 KB gzip to the engine. Workaround: replace other named entities with the character itself or its numeric reference before you import the markdown.

### Inline images in imported markdown

An image alone on its line becomes an `IMAGE` block. An image inside a paragraph, such as `see ![chart](chart.png) below`, stays literal text, since 1.0 has no inline image. Workaround: put each image on a line of its own before you import the markdown, or write an extension that adds an inline image atom.

## API

### `BlockCanvas`

Every 0.4 prop keeps its name, and its meaning except as the changes below say: `blocks`, `onChange`, `onDelete`, `blockTypes`, `upload`, `resolveAssetUrl`, `onError`, `readOnly`, `className`, `id` and `aria-label`. New ones are optional:

| Prop | What it does |
| --- | --- |
| `extensions` | Opt-in features and extensions of your own, read when the canvas mounts. Remount with a new `key` to change them. |
| `highlight` | Colours code blocks with your highlighter. Keep it stable. |
| `autoFocus` | Focuses the canvas on mount. Off by default. |
| `placeholder` | The text of an empty paragraph that holds the caret. |
| `labels` | Every string the canvas shows or speaks, English by default. Keep the object stable. |
| `blockLink` | The address "Copy link to block" copies, by default the page's address with `#block-<id>`. |
| `ref` | A `QuoinEditorHandle` with the `editor`, the `controller`, `focus()` and `toMarkdown()`. |

Two behaviours changed:

- **`onDelete` reports more.** Besides the block menu's Delete, it reports whole blocks removed by typing over a selected block or by pasting over selected blocks. A line that Backspace or Delete merges into its neighbour is still not reported. To restore a block, splice it back into `blocks` once they no longer hold it, as on a later click of an Undo toast, not inside the callback.
- **A collaborative canvas is uncontrolled.** A canvas given `collaborationExtension` from `quoin-editor/yjs` takes its content from the shared document. Pass the starting blocks once and keep echoing `onChange`; while the shared document is connected, any other array handed to `blocks` is ignored, with a warning in development.

### `defineBlock`

`defineBlock` takes the same definition. `icon` now accepts any component that takes a `className` and `aria-hidden`, not only a lucide one. A custom block shows its `preview` at rest, and its `editor` opens on a double click, its Edit button or Enter on the selected block; Escape closes it.

A definition of a type the canvas types into in place, `MARKDOWN`, `CALLOUT` or `TOGGLE`, now draws only on a read-only canvas, and an editable canvas warns in development. To change how one of them looks while it is edited, give an extension a renderer for the type in `ui.renderers`:

```tsx
import { BlockCanvas, EditableRegion, type BlockRenderer, type ExtensionUI, type QuoinBlock } from 'quoin-editor';
import { defineExtension } from 'quoin-editor/engine';

const Callout: BlockRenderer = ({ block }) => (
  <div className="my-callout" data-tone={String(block.attrs.tone)}>
    <EditableRegion block={block.id} region="body" label="Callout" />
  </div>
);

const ui: ExtensionUI = { renderers: { CALLOUT: Callout } };
const extensions = [defineExtension({ name: 'my-callout', ui })];

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

### `useQuoin`

`QuoinConfig`, which `useQuoin()` returns to a custom block, gains `highlight` and the required `controller` and `labels`. `QuoinProvider` fills them in, so only a `QuoinConfig` built by hand, such as a test double for a custom block, needs `controller: null` and `labels: englishLabels` added.

### Entries

- `quoin-editor/headless` now exports the view and the engine (`useQuoinEditor`, `EditorView`, `createEditor` and the rest), and none of the 0.4 helpers. The main entry re-exports all of it.
- `formatShortcut` is exported from `quoin-editor` only. Import it from there instead of `quoin-editor/headless`.
- `quoin-editor/engine` is the engine alone, with no React and no `'use client'` banner: import `toMarkdown`, `toHTML` and the other pure functions from it in a server component.

### Removed helpers

The 0.4 helpers worked on the text of a textarea. In 1.0 each is an engine command, run through the canvas's ref (`handle.current?.editor.commands.<name>(...)`) or a headless editor, or is no longer needed.

| 0.4 | 1.0 | Notes |
| --- | --- | --- |
| `applyEdit`, `Edit` | `insertText` | The editor applies every edit itself; insert text at the selection with the command. |
| `lineAt` | Nothing | Each text block holds one line. |
| `toggleLinePrefix`, `LinePrefix` | `setBlockType` | `setBlockType('MARKDOWN', { kind: 'heading', level: 2 })`, `{ kind: 'bullet' }`, `{ kind: 'ordered' }` and so on. |
| `continueList` | `splitBlock` | Enter continues a list on its own. |
| `indentList` | `indent`, `outdent` | Tab and Shift+Tab call them. |
| `wrapSelection`, `WrapKind` | `toggleMark`, `setLink` | `toggleMark('bold')`, `'italic'` or `'code'`; `setLink` for `'link'`. |
| `linkPaste` | `setLink`, `pasteLinkOverSelection` | Pasting an address over a selection links it on its own. |
| `insertCommand`, `InsertableCommand` | `insertBlockAfter`, `setBlockType` | `setBlockType` for a heading or a list, `insertBlockAfter` for a code block or a divider; a table needs `quoin-editor/table`. |
| `shouldOpenPalette` | Nothing | The slash menu opens from the text typed, virtual keyboards included. |
| `caretRect`, `CaretRect` | Nothing | The caret is the browser's own: read `window.getSelection()`. |
| `useMarkdownKeymap` | `defineExtension` | Give an extension a `keymap` of commands. |
| `TEXT_COMMANDS`, `TextCommand` | `defineExtension` | Add slash items through an extension's `ui.slashItems`. |
| `useBlockList`, `BlockList`, `UndoToken` | Nothing | The host holds the array itself and hands it to `blocks`; the rows below map each member. |
| `BlockList.insertAt` | `insertBlockAfter` | Inserts after the selected block. |
| `BlockList.update` | `setAttrs` | Patches the selected block; to replace whole blocks, hand `blocks` a new array. |
| `BlockList.remove` | `deleteBlocks` | Deletes the selected blocks. |
| `BlockList.undo` | `undo` | The editor's history undoes a deletion, with no token. |
| `BlockList.move` | `moveBlocksUp`, `moveBlocksDown` | |
| `BlockList.reorder` | `moveBlocksTo` | `moveBlocksTo(ids, toIndex, indent)`. |
| `BlockList.reset` | Nothing | Hand `blocks` a new array, or call `editor.setBlocks(blocks)`. |
| `useAutoGrow` | Nothing | Nothing is drawn in a textarea any more. |

```tsx
import { useRef } from 'react';
import { BlockCanvas, type QuoinBlock, type QuoinEditorHandle } from 'quoin-editor';

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  const handle = useRef<QuoinEditorHandle>(null);
  const heading = () => handle.current?.editor.commands.setBlockType('MARKDOWN', { kind: 'heading', level: 2 });
  return (
    <>
      <button type="button" onClick={heading}>
        Heading
      </button>
      <BlockCanvas ref={handle} blocks={blocks} onChange={onChange} />
    </>
  );
}
```

### Command names of the design spec

The 1.0 design spec named `mergeBackward`, `mergeForward` and `insertBlocks` as commands. They are not commands: `deleteBackward` at the start of a block joins it to the one before, `deleteForward` at its end joins the next one to it, and `insertBlockAfter` and `insertSlice` insert blocks. Use those names.

### Labels

Strings come from `labels`. Two keys are functions rather than strings: `blockDeleted(n)` and `undoHint(shortcut)`. English callout tone names are written in lower case in the tone chip and its menu; give `calloutTones` to write them otherwise:

```tsx
import { BlockCanvas, type QuoinBlock, type QuoinLabels } from 'quoin-editor';

const labels: Partial<QuoinLabels> = {
  calloutTones: { info: 'Info', tip: 'Tip', success: 'Success', warning: 'Warning', danger: 'Danger' },
  blockDeleted: (n) => (n === 1 ? 'Block removed' : `${n} blocks removed`),
  undoHint: (shortcut) => `${shortcut} brings it back`,
};

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} labels={labels} />;
}
```

## Features that now need an import

In 0.4 the slash palette's Table command wrote a markdown table into the block. In 1.0 a table is a `TABLE` block, drawn and edited by `quoin-editor/table`, which a page loads only when it imports it. Without it, a table, including one split out of a 0.4 block, is drawn as an unsupported block and its data is kept as it was. The one-line change is to pass the extension:

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { tableExtension } from 'quoin-editor/table';

const extensions = [tableExtension()];

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

`catalogue()` from `quoin-editor/catalogue` adds every opt-in feature at once: tables, embeds, math, a table of contents, mentions, emoji, find and replace and stats.

## Styling

- Every 0.4 `--quoin-` token keeps its name, and the stylesheet still sits in the one `quoin` cascade layer.
- New tokens: `--quoin-selection`, the writer's text and background colours `--quoin-color-*` and `--quoin-bg-*`, `--quoin-comment`, `--quoin-comment-active` and `--quoin-comment-edge`, `--quoin-diff-inserted` and `--quoin-diff-deleted`, and `--quoin-link`. Each has a light and a dark default; a host that maps its own tokens onto Quoin's can map these too.
- `color-scheme` is declared for light and dark.
- The DOM and the class names inside the canvas are new. CSS that targeted 0.4 internals, such as a block card or its textarea, no longer matches; style through the tokens.

## React 18

React 18.2 and 19 are both supported, as 0.4.1 made them. CI typechecks the packed package against both majors and renders the server entries in plain Node on each, and `BlockCanvas` forwards its ref, so a `QuoinEditorHandle` reaches you on React 18 too.

## The package

The tarball ships ESM and CommonJS builds of every entry, with their sourcemaps. The sourcemaps leave out `sourcesContent`: a debugger maps to the original file names and lines, but shows their text only where it can read the sources, such as from the repository at the release tag.

## Checklist

- [ ] Install `quoin-editor@^1`.
- [ ] Keep `indent` and the new optional keys when you copy, validate or store blocks, and let a strict schema accept them.
- [ ] Expect a 0.4 block of several lines to be split into one block per line, with derived ids, on its first edit.
- [ ] Check captions and callout bodies that hold `*`, `_`, `` ` ``, `[` or `&`, which now read as inline markdown.
- [ ] Replace named entities other than the 23 listed, and move inline images onto lines of their own, in markdown you import.
- [ ] Replace each removed helper with the command in the table above.
- [ ] Import `formatShortcut` from `quoin-editor`.
- [ ] Move a `MARKDOWN`, `CALLOUT` or `TOGGLE` definition used on an editable canvas to an extension's `ui.renderers`.
- [ ] Wait until `blocks` no longer hold a block before restoring it from `onDelete`.
- [ ] Pass `tableExtension()` (or `catalogue()`) if your documents hold tables.
- [ ] Map the new tokens if you map Quoin's tokens to your own, and drop CSS that targeted 0.4 internals.
- [ ] Treat a canvas with a collaboration extension as uncontrolled.
