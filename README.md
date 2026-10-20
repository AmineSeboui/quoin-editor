# Quoin

[![npm](https://img.shields.io/npm/v/quoin-editor)](https://www.npmjs.com/package/quoin-editor)
[![CI](https://github.com/AmineSeboui/quoin-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/AmineSeboui/quoin-editor/actions/workflows/ci.yml)

A React block editor: typed blocks, drag to reorder, a markdown surface with a slash palette, and an open block type registry.

Quoin edits markdown. It does not render it. A markdown block is edited in a plain textarea with shortcuts, list continuation and a slash palette, and it is drawn at rest as plain text. There is no remark or rehype pipeline in the package. A host that wants rich rendering registers its own `preview` on a block definition (see [Custom blocks](#custom-blocks)), so Quoin never forces a markdown renderer on you.

Documentation: [amineseboui.github.io/quoin-editor](https://amineseboui.github.io/quoin-editor). Package: [`quoin-editor` on npm](https://www.npmjs.com/package/quoin-editor).

Quoin is published on npm as `quoin-editor`, because npm rejects the bare name `quoin` as too similar to an existing package. Everywhere below, `quoin-editor` is the package you install and import.

## Install

```bash
npm install quoin-editor
```

```bash
yarn add quoin-editor
```

Quoin needs React 18.2 or later (React 19 is supported) and TypeScript 5.4 or later if you use TypeScript. The block registry relies on the built-in `NoInfer` utility type, which arrived in 5.4.

**Tailwind is not required, and either major version works.** See [Tailwind, or no Tailwind](#tailwind-or-no-tailwind) for the one thing a v4 host has to do.

The package is around 200 kB packed. It depends on `@dnd-kit` for dragging, five Radix primitives, `cmdk` for the slash palette, `lucide-react` for the icons, and `clsx` and `class-variance-authority` for class composition. That is the price of the canvas: the cards, the drag gutter, the inserters, the palette and the dialogs. If you want the text editing and none of the UI, [`quoin-editor/headless`](#headless) has no component or UI library dependency at all.

## Quickstart

```tsx
import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

export function Editor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  return <BlockCanvas blocks={blocks} onChange={setBlocks} />;
}
```

A document is an array of `QuoinBlock`, each `{ id, type, data }`. Five block types ship by default: `MARKDOWN`, `CALLOUT`, `CODE`, `IMAGE` and `FILE`. The main entry point is marked `'use client'`, so render `BlockCanvas` from a client component.

If your application has Tailwind of its own, import the stylesheet from your CSS into a layer you have named instead of from JavaScript, so you decide which of the two wins. See [Cascade layers and import order](#cascade-layers-and-import-order).

## The controlled-component contract

`BlockCanvas` behaves like a controlled `<input value onChange>`. Update `blocks` synchronously from `onChange`.

Applying the edit late is tolerated, as long as what you eventually hand back is one of the arrays the canvas gave you. It recognises its own output even when the echo is several keystrokes behind, so `startTransition` and a debounced `setBlocks` both keep typing intact.

```tsx
import { startTransition, useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

export function TransitionEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  return (
    <BlockCanvas
      blocks={blocks}
      onChange={(next) => startTransition(() => setBlocks(next))}
    />
  );
}
```

Since 0.4.1, stores that clone the document on the way through, such as a Redux or Zustand round trip or a server-synced store, are supported too. The canvas recognises an array it emitted however late it comes back, and a structural copy of one as long as it is within the last 64 edits.

Debounce the side effect, not the state. `useAutosave` does exactly that: it tracks the values you give it, waits for the edits to settle, then calls your `save`, and it retries a failed save with exponential backoff.

```tsx
import { useState } from 'react';
import { BlockCanvas, useAutosave, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

async function saveDocument(blocks: QuoinBlock[]) {
  const response = await fetch('/api/document', { method: 'PUT', body: JSON.stringify(blocks) });
  return response.json() as Promise<{ revision: number }>;
}

export function AutosavingEditor({ initial }: { initial: QuoinBlock[] }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(initial);
  const { status } = useAutosave({
    deps: [blocks],
    build: () => blocks,
    save: saveDocument,
    debounceMs: 1000,
  });
  return (
    <>
      <BlockCanvas blocks={blocks} onChange={setBlocks} />
      <p role="status">{status}</p>
    </>
  );
}
```

`save` may return anything, so a mutation, an axios call or a `fetch` that resolves to a body goes straight in with no wrapper to discard the value. A save fails by rejecting, or by resolving to an explicit `{ ok: false }`; everything else, `undefined` included, is a success. `status` moves `idle` to `saving` to `saved`, or to `retrying` while it backs off, and `retry()` tries again at once. Since 0.4.1 one save runs at a time, with the newest payload queued behind it, and a pending edit is saved at once when the component unmounts or the page is hidden (`flush()` does the same on demand). Retries stop after `maxRetries` (default 8) or when `isRetryable(error)` returns false; `status` is then `failed` and `error` holds the reason.

### Loading, undoing and discarding

You can hand the canvas a new `blocks` array at any time to load, undo or merge a document. A new array replaces what the canvas shows when it differs from the last array you supplied.

When you echo `onChange` back into `blocks`, as every sample above does, the last array you supplied is the edited document, so `setBlocks(saved)` differs from it and resets the canvas with nothing more to do.

The case that needs care is a host that does not echo edits back. There, the last array you supplied is still the original, and an array structurally equal to it is ignored: a "discard changes" button that re-supplies the original document does nothing. The same goes for restoring a copy of a state from the last 64 edits, which reads as a late echo of the canvas's own output. To force a reset, remount the canvas with a React `key`. The sample below uses a `key` so it works either way.

```tsx
import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

export function EditorWithDiscard({ saved }: { saved: QuoinBlock[] }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(saved);
  const [revision, setRevision] = useState(0);

  function discard() {
    setBlocks(saved);
    setRevision((current) => current + 1);
  }

  return (
    <>
      <BlockCanvas key={revision} blocks={blocks} onChange={setBlocks} />
      <button type="button" onClick={discard}>
        Discard changes
      </button>
    </>
  );
}
```

The structural comparison is shallow over each block's `data`. A host whose block `data` contains nested objects rebuilt on every render, and which does not echo `onChange` back into `blocks`, can still lose an edit. All five core block types have flat data, so this only affects custom blocks. Keep `data` flat, or keep it referentially stable.

### Undoing a deletion

`onChange` reports a new array and nothing about what changed, so a host that wants a "Block deleted / Undo" toast would have to diff two arrays to find out. `onDelete` tells it instead: it fires for each whole block the writer removes, through its actions menu, by typing over a selected block or by pasting over selected blocks, with the block and the index it held. Lines that Backspace or Delete join are not reported.

It runs just after the `onChange` that reports the document without that block. Restoring is an ordinary document load: once your `blocks` no longer hold the block, splice it back at its index and supply the result as `blocks`.

Do that on a later interaction, such as the click of an Undo toast, which is what the sample below does. A host that applies `onChange` at once can also restore inside `onDelete`. One that applies it in a `startTransition` or after a debounce has not taken the removal when `onDelete` runs: splicing the block into that state duplicates it, and supplying again an array equal to the one it last supplied changes nothing, because the canvas ignores it.

```tsx
import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

export function EditorWithUndo({ saved }: { saved: QuoinBlock[] }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(saved);
  const [removed, setRemoved] = useState<{ block: QuoinBlock; index: number } | null>(null);

  function restore() {
    if (!removed) return;
    const next = [...blocks];
    next.splice(removed.index, 0, removed.block);
    setBlocks(next);
    setRemoved(null);
  }

  return (
    <>
      <BlockCanvas blocks={blocks} onChange={setBlocks} onDelete={(block, index) => setRemoved({ block, index })} />
      {removed && (
        <button type="button" onClick={restore}>
          Undo delete
        </button>
      )}
    </>
  );
}
```

A restored block comes back at rest, even one that was inserted moments before it was deleted, so the undo does not pull the caret out of whatever is being written.

## Hoist `blockTypes` and your handlers

`BlockCanvas` builds its configuration from `blockTypes`, `upload`, `resolveAssetUrl`, `onError` and `highlight`, and memoises it on their identity. Pass a new array or a new function on every render and the memo is busted, which re-renders every block editor on the page.

```tsx
import { BlockCanvas, coreBlocks, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

export function SlowEditor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return (
    <BlockCanvas
      blocks={blocks}
      onChange={onChange}
      blockTypes={[...coreBlocks]}
      onError={(error) => console.error(error)}
    />
  );
}
```

Hoist them to module scope instead, or wrap them in `useMemo` and `useCallback` when they depend on props.

```tsx
import { BlockCanvas, coreBlocks, type AnyBlockDefinition, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

const blockTypes: AnyBlockDefinition[] = [...coreBlocks];
const reportError = (error: Error) => console.error(error);

export function FastEditor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} blockTypes={blockTypes} onError={reportError} />;
}
```

## Custom blocks

A block type is a definition built with `defineBlock`. `blockTypes` defaults to `coreBlocks`, so extend it by spreading them and adding your own. When two definitions share a `type`, the last one wins, which is also how you override a core block. Your own definition of `DIVIDER` or `CODE` draws as a block of yours everywhere. Your own definition of `MARKDOWN`, `CALLOUT` or `TOGGLE` draws only on a read-only canvas: an editable canvas keeps those blocks its own, since they are typed into in place, and warns about it in development.

```tsx
import { Bookmark } from 'lucide-react';
import {
  BlockCanvas,
  coreBlocks,
  defineBlock,
  type AnyBlockDefinition,
  type BlockEditorProps,
  type BlockPreviewProps,
  type QuoinBlock,
} from 'quoin-editor';
import 'quoin-editor/styles.css';

type SavedLinkData = { url: string; title: string };

function SavedLinkEditor({ data, onChange }: BlockEditorProps<SavedLinkData>) {
  return (
    <div>
      <input
        aria-label="Title"
        value={data.title}
        onChange={(event) => onChange({ ...data, title: event.target.value })}
      />
      <input
        aria-label="URL"
        value={data.url}
        onChange={(event) => onChange({ ...data, url: event.target.value })}
      />
    </div>
  );
}

function SavedLinkPreview({ data }: BlockPreviewProps<SavedLinkData>) {
  if (data.url === '') return <p>No link yet</p>;
  return <a href={data.url}>{data.title || data.url}</a>;
}

const savedLink = defineBlock({
  type: 'SAVED_LINK',
  label: 'Saved link',
  icon: Bookmark,
  editor: SavedLinkEditor,
  preview: SavedLinkPreview,
  initialData: () => ({ url: '', title: '' }),
});

const blockTypes: AnyBlockDefinition[] = [...coreBlocks, savedLink];

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} blockTypes={blockTypes} />;
}
```

A definition has these fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `type` | yes | The string stored on each block. It is how the registry finds the definition. |
| `label` | yes | The name shown in menus and the slash palette. |
| `icon` | yes | A [lucide](https://lucide.dev) icon component. Quoin depends on `lucide-react@^1`; add that same major to your own dependencies to import icons, so you do not end up with a second copy and mismatched icon types. |
| `editor` | one of the two | The editing surface. It receives `data` and `onChange`. Call `onChange` with the whole next `data`, not a patch. Omit it for a block that is never editable here. |
| `preview` | one of the two | What the block shows when it is not being edited. Omit it for an edit-only block. |
| `initialData` | no | Seeds `data` when a block of this type is inserted. It is checked against the editor's data type. |
| `inSlashPalette` | no | Set to `false` to keep the type out of the slash palette and the inserter. Defaults to `true`. |
| `alwaysEditing` | no | Renders the editor permanently instead of a preview you click to edit. |

Supply `editor`, `preview` or both. Omitting both is a type error, because such a block could only ever draw its own label.

**Omit `editor` for a block that is not yours to edit** here: content that belongs to a server-side record, a generated summary, an audit trail. The card then offers no way in, with no edit button and no click target, and `preview` becomes required because it is the only thing left that can draw the block.

```tsx
import { ShieldCheck } from 'lucide-react';
import { defineBlock } from 'quoin-editor';

const audit = defineBlock<{ approver: string }>({
  type: 'AUDIT',
  label: 'Audit trail',
  icon: ShieldCheck,
  preview: ({ data }) => <p>Signed off by {data.approver}</p>,
});
```

**Omit `preview` only for a block you never show read-only.** A `readOnly` canvas draws previews and never editors, so such a block shows nothing there but its own label. Quoin warns once per type in the console when that happens, naming the type. The same applies to `alwaysEditing`, which is also an editor and is also not drawn on a read-only canvas.

### What the core blocks store

Each core block keeps its content under its own keys. A host that persists blocks reads and writes these, so they are exported as types: import them rather than retyping the shapes.

| Type | `data` | Exported as |
| --- | --- | --- |
| `MARKDOWN` | `markdown: string` | `MarkdownBlockData` |
| `CALLOUT` | `tone: string`, `body: string` | `CalloutBlockData` |
| `CODE` | `language: string`, `code: string` | `CodeBlockData` |
| `IMAGE` | `storageKey: string`, `alt: string`, `caption?: string`, `width?: number`, `height?: number`, `url?: string`, `align?: 'left' \| 'center' \| 'right'`, `widthPercent?: number` | `ImageBlockData` |
| `FILE` | `storageKey: string`, `filename: string`, `size?: number`, `mime?: string` | `FileBlockData` |

`CoreBlockData` maps each `type` string to its shape, for a host writing one function over all five.

Two of these are worth saying out loud, because both have been guessed wrong:

- **The callout's prose is `body`, not `text`.** The label over the field reads "Callout text", which is what the author sees; `body` is what the block stores. `tone` is one of `info`, `tip`, `warning`, `success` or `danger`, each drawn in its own colour; anything else falls back to the neutral border and fill.
- **Markdown blocks store markdown source, not rendered HTML.** Quoin edits and stores the source and renders it as plain text; supply a `preview` if you want it rendered.

The optional fields are written after a block's first save, and only once set: an image's `caption` when the author types one, its `width` and `height` once the uploaded bytes have been measured, its `url`, `align` and `widthPercent` when the author links, aligns or resizes it, a file's `size` when the upload reports it and its `mime` when the file declares a type. `src/blocks/data.test.ts` holds the table above to the declared types and to the keys a file upload writes, and the image and file blocks' tests check the exact data each of their controls writes.

### Reaching uploads from a custom block

A block editor receives only `data` and `onChange`, but the canvas configuration reaches it through context, so an upload control inside a custom block needs no wiring from you.

`UploadField` is an upload control exported for your own blocks. It reads `upload` from the canvas it is rendered in, disables itself while a file is in flight, announces the progress to assistive technology, renders a rejection's message beside the button, and says that uploads are not configured when the host wired none.

```tsx
import { UploadField, type BlockEditorProps } from 'quoin-editor';

type SlidesData = { storageKey: string; filename: string };

export function SlidesEditor({ data, onChange }: BlockEditorProps<SlidesData>) {
  return (
    <div>
      <p>{data.storageKey === '' ? 'No deck yet' : data.filename}</p>
      <UploadField
        category="slides"
        label="Upload slides"
        accept=".pdf"
        onUploaded={(result) => onChange({ storageKey: result.storageKey, filename: result.filename })}
      />
    </div>
  );
}
```

Register that editor with `defineBlock` as above, and the canvas's `upload` function receives `'slides'` as its category. `UploadField` takes `category`, `label`, an optional `accept` and `onUploaded`.

`FilePickerButton` is the picker underneath it: a labelled button laid over a transparent file input, which hands you the chosen `File` and uploads nothing itself. Take that one when you want your own busy and error presentation, and pass it `busy` while your upload runs: it refuses picks but keeps focus on the control, where `disabled` would let the browser drop it.

For anything neither control covers, `useQuoin()` returns `blockTypes`, `upload`, `resolveAssetUrl` and `onError`. It throws outside a `QuoinProvider`, so call it from a block the canvas is rendering.

```tsx
import { useQuoin, type BlockEditorProps } from 'quoin-editor';

type AttachmentData = { storageKey: string; filename: string };

export function AttachmentEditor({ data, onChange }: BlockEditorProps<AttachmentData>) {
  const { upload, resolveAssetUrl, onError } = useQuoin();

  async function store(file: File) {
    if (!upload) return;
    try {
      const stored = await upload(file, 'attachment');
      onChange({ storageKey: stored.storageKey, filename: stored.filename });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('The upload failed.'));
    }
  }

  return (
    <div>
      {data.storageKey !== '' && <a href={resolveAssetUrl(data.storageKey)}>{data.filename}</a>}
      <input
        type="file"
        disabled={!upload}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void store(file);
        }}
      />
    </div>
  );
}
```

`upload` is absent when the host wired none, which is why the control above disables itself rather than failing on the pick. `resolveAssetUrl` defaults to returning the key unchanged, and `onError` to `console.error`.

The preview is also how you bring your own markdown renderer to readers. Register a `MARKDOWN` definition last with your preview, and a read-only canvas draws every `MARKDOWN` block with it:

```tsx
import { blockByType, coreBlocks, defineBlock, type AnyBlockDefinition, type BlockPreviewProps } from 'quoin-editor';

function RichMarkdownPreview({ data }: BlockPreviewProps) {
  return <article>{String(data.markdown ?? '')}</article>;
}

const core = blockByType(coreBlocks, 'MARKDOWN');

export const blockTypes: AnyBlockDefinition[] = core
  ? [...coreBlocks, defineBlock({ ...core, preview: RichMarkdownPreview })]
  : coreBlocks;
```

Replace the `<article>` with whatever renderer you use.

## Uploads

Quoin never performs a request. You hand it an `upload` function, and the image and file blocks call it with the chosen `File` and a `category` that names what the file is for (the core blocks use `'image'` and `'file'`). It resolves with an `UploadResult`.

```tsx
import { BlockCanvas, type QuoinBlock, type UploadFn } from 'quoin-editor';
import 'quoin-editor/styles.css';

const upload: UploadFn = async (file, category) => {
  let response: Response;
  try {
    response = await fetch(`/api/uploads?category=${encodeURIComponent(category)}`, {
      method: 'POST',
      body: file,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new Error(response.status === 413 ? 'That file is too large.' : 'The upload was refused.');
  }
  const stored = (await response.json()) as { key: string };
  return { storageKey: stored.key, filename: file.name, size: file.size };
};

const resolveAssetUrl = (storageKey: string) => `/api/files/${encodeURIComponent(storageKey)}`;
const reportError = (error: Error) => console.error(error);

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return (
    <BlockCanvas
      blocks={blocks}
      onChange={onChange}
      upload={upload}
      resolveAssetUrl={resolveAssetUrl}
      onError={reportError}
    />
  );
}
```

- `UploadResult` is `{ storageKey, filename, size, assetId? }`. `storageKey` is an opaque key your storage can find the file by. It is what Quoin stores in the document.
- `resolveAssetUrl` turns a `storageKey` back into a URL for display. It defaults to returning the key unchanged. The image and file blocks, and `toHTML`, use only an http, https, blob, data or relative URL it returns.
- An `upload` that resolves to anything without a string `storageKey` has failed: the image and file blocks show "Upload failed." and write nothing, and a file dropped or pasted on the canvas is left out and reported to `onError` in the same words.
- **Reject with an `Error` whose `message` is safe to show.** It is rendered verbatim beside the upload button. A rejection that is not an `Error`, or an `Error` with an empty message, shows a generic "Upload failed." instead.
- **Catch network failures and rethrow with your own wording.** A raw `fetch` rejection such as "Failed to fetch" would otherwise be shown to the user verbatim.
- The upload control is disabled while an upload is in flight.
- With no `upload` function, upload fields render disabled, with a note that uploads are not configured.
- `onError` receives errors Quoin cannot show inline, such as an empty markdown file picked for import. It defaults to `console.error`.

## Code blocks

A code block is typed in place: Tab and Shift+Tab indent and outdent the selected lines, Enter keeps the indentation of the line, the arrows leave the block from its first and last lines, and Backspace in an empty block turns it into a paragraph. Its header holds a language picker (Alt+F10 from the code reaches it) and a copy button. The canvas draws code blocks, and offers to insert them, while `blockTypes` registers `CODE`, as `coreBlocks` does.

Pass `highlight` to colour the code. It gets the code and the block's language as stored, which can be an alias such as `ts`, and returns one array of tokens per line, `{ text, color?, className? }`, whose texts spell the line exactly. Wrap Shiki, Prism or highlight.js in one, and keep the function stable. A highlighter that throws, or whose tokens do not spell the code, leaves the code as plain text.

```tsx
import { BlockCanvas, type CodeHighlighter, type QuoinBlock } from 'quoin-editor';

const keyword = /^(?:const|let|function|return)$/;

const highlight: CodeHighlighter = (code) =>
  code.split('\n').map((line) =>
    line.split(/\b/).map((text) => (keyword.test(text) ? { text, color: '#d73a49' } : { text })),
  );

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} highlight={highlight} />;
}
```

## Image blocks

An image block with no picture yet offers an upload button, a link to embed instead, and room to drop or paste an image file. An image file pasted or dropped anywhere else in the canvas becomes an image block of its own. The upload's `storageKey` is written as soon as `upload` resolves, then the picture's `width` and `height` once it has been measured from `resolveAssetUrl(storageKey)`. Of two uploads into one block, the one started last wins, and its measurement is the only one written.

The picture is drawn from `url` when the block has one, otherwise from `resolveAssetUrl(storageKey)`. A picture that cannot be resolved or loaded, or whose key resolves to anything but an http, https, blob, data or relative address, is drawn as missing, with its alt text. An image without alt text is announced as "Image, no description".

The arrows select an image as a whole. Enter on the selected image, or a key typed on it, takes the caret into its caption, which is inline markdown like any text. While the image is selected, a toolbar offers left, centre and right alignment, a new upload in its place, its alt text, a download and Delete: Alt+F10 reaches it, the arrows walk it, Tab goes on to the width handles and Escape goes back to the image. The handles on either side of the picture are sliders: drag one, or press the arrows, Home and End on a focused one, to set the width in steps of 5 percent, from 10 to 100 percent of the line. A read-only canvas draws the picture and a caption it has, and nothing to edit.

## File blocks

A file block with no file yet offers an upload button and room to drop or paste any file. A file other than an image pasted or dropped anywhere else in the canvas becomes a file block of its own. Once `upload` resolves, the block keeps the `storageKey`, `filename` and `size` it returned, and the type the file declares as `mime`, in one step of history. Of two uploads into one block, the one started last wins.

A file block holding a file is a card: an icon for its type, chosen from the top-level type of `mime` (image, audio, video or text) and else from the extension of its name, the name, the size in binary units (`1.5 KB`), and a Download link to `resolveAssetUrl(storageKey)`, named "Download" and the file's name, which opens in a new tab where the browser cannot download it. A card whose key cannot be resolved, or resolves to anything but an http, https, blob, data or relative address, has no link. The size is worded by the `fileSize` label, so a host can write it in its own language.

The arrows select a card as a whole, and it is announced as "File" and the file's name. Enter on the selected card goes on in a new line under it, and a key typed on it never replaces it; on an empty file block, Enter focuses the upload button. While the card is selected, a toolbar offers a new upload in its place and Delete: Alt+F10 reaches it, the arrows walk it, Tab goes on to the Download link and Escape goes back to the card. A read-only canvas draws the card with its link in the tab order, and nothing to edit.

## Opt-in features

Features beyond the core blocks ship as their own entries, so a host that leaves one out never downloads it. Add a feature's extension to `extensions`, or `catalogue()` from `quoin-editor/catalogue` for all of them, each taking its options under its own name (`catalogue({ table: { labels } })`, or `false` to leave one out). Every string a feature shows or speaks comes from its own `labels` option, English by default, the name its blocks go by in their block menu and while one is selected as a whole included.

A block whose feature is not installed, such as a table on a canvas without `tableExtension()`, an embed without `embedExtension()`, a math block without `mathExtension()` or a table of contents without `tocExtension()`, is drawn as an unsupported block. Its data is kept as it was, through edits around it, `onChange` and markdown. A math formula in a line, without `mathExtension()`, shows its LaTeX as plain text.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { tableExtension } from 'quoin-editor/table';
import 'quoin-editor/styles.css';

const extensions = [tableExtension({ labels: { table: 'Tableau', deleteRow: 'Supprimer la ligne' } })];

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

### Tables

`quoin-editor/table` draws `TABLE` blocks as native tables, with a header row of column headers when the block has one, and every cell typed in place. `/table` inserts a 3 by 3 table. Tab and Shift+Tab move to the next and the previous cell, and Tab in the last cell adds a row. Enter in an empty cell of the last row adds a row, and elsewhere breaks the line. The arrows move between rows from the first and last lines of a cell. A table wider than the line scrolls inside its block, and the cell the caret moves into is brought into view.

The handles of a row and of a column open menus that insert, move and delete rows and columns, align a column and turn the header row on and off. Alt+F10 from a cell reaches them, the arrows move between them, Tab goes on to the border of the column, and Escape goes back to the caret. A + on the edge between two rows or two columns inserts one there; the same inserts are in the menus. A column border is a separator: drag it, or press the arrows on it, to set the width of the column, kept in pixels in `widths`. A drag across cells selects them as a range, which Backspace and Delete empty, a key typed or text pasted replaces, and the formatting shortcuts format whole. A read-only canvas draws the table and nothing to edit.

The engine commands, such as `insertTable`, `addRow` and `setColumnWidth`, and the cell selection plugin are exported from `quoin-editor/table` too.

### Embeds and bookmarks

`quoin-editor/embed` draws `EMBED` blocks as the frame of the provider that frames their address, and `BOOKMARK` blocks as cards that link to their page. The built-in providers are YouTube (`youtube.com/watch?v=`, `youtu.be/` and shorts, framed from `youtube-nocookie.com`), Vimeo, Loom, Figma, CodePen, Spotify and SoundCloud, the same ones `toHTML` frames. Every frame, on the canvas and in `toHTML` with `embeds: 'iframe'`, is https only, with `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"`, `loading="lazy"` and `referrerpolicy="strict-origin-when-cross-origin"`. The canvas titles each frame after its provider and draws it at the ratio of a video (Spotify and SoundCloud players at their own heights). An `EMBED` whose address no provider frames is drawn as a link card instead.

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

On an editable canvas a press on an embed selects the block rather than the frame, which is out of the tab order; Enter on the selected embed moves focus into the frame. A read-only canvas draws the frames as they are, in the tab order. Without `unfurl`, a bookmark shows its address and domain. Every string a bookmark holds is drawn as text, and its picture only from an http or https address.

### Math

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

`$$` and a space at the start of a paragraph, or `/` and Block equation, make a math block and open its editor, a popover with the LaTeX and a live preview. A click on a math block, or Enter on one selected as a whole, opens it too: Mod+Enter or Save stores the LaTeX, Enter starts a new line, and Escape keeps what was there, each handing focus back to the block. A formula typed between dollars, such as `$x^2$`, becomes a formula in the line as its closing dollar is typed, wherever the markdown reads one, so `$5 and $10` stays text; Backspace right after gives the dollars back. A dollar in code never opens or closes a formula, and no formula runs across the edge of a link or of other formatting. A formula typed between backticks, such as `` `$x$` ``, stays a formula inside the code, because it converts before the closing backtick makes the code. Backspace right after a formula selects it, and a second Backspace deletes it. A click on a formula, or Enter while it is selected, opens the same editor, where Enter stores and Shift+Enter starts a new line, and Inline equation in the `/` menu opens it at the caret, writing the formula there once a LaTeX is stored and leaving the text as it was otherwise; Enter with the caret after a formula starts a new line as anywhere else, and Shift+click extends the selection. A press outside the editor, or Tab out of it, stores the LaTeX too, and a press leaves focus where it lands. Storing an empty formula removes it, and an empty block shows "Empty equation". Each store is one undo step. A read-only canvas draws blocks and formulas and opens no editor.

### Table of contents

`quoin-editor/toc` draws `TOC` blocks as a navigation named "Table of contents" that lists the headings of the document as links, nested by level, and follows them as they are written. A heading with no text is left out, and a skipped level nests one deep, as in the table of contents `toHTML` writes. `/` and Table of contents inserts one; with no headings it shows "Add headings to build the table of contents". A second table of contents in the same document, and any after it, is named with its number, "Table of contents 2", so that each navigation has a name of its own.

Each entry links to `#block-<id>`, the fragment a copied link to the block ends with. A click on an entry, or Enter on it, puts the caret at the end of its heading and scrolls the heading into view, smoothly unless the reader prefers reduced motion; Mod+click and a middle click leave the link to the browser, which opens the page at the heading in a new tab. On an editable canvas the arrows, or a press beside the entries, select the block as a whole, Enter then moves focus to its first entry, Tab and Shift+Tab walk the entries and go back to the block past either end, and Escape goes back to the block; the entries stay out of the page's tab order. A read-only canvas keeps them in it, and a click moves focus to the heading without changing the document. When a change from elsewhere moves the heading of the focused entry, focus follows its entry, and when it takes the heading away, focus goes back to the block.

`headings(doc, { schema })` lists the headings the block shows, each with its `blockId`, its `anchor` in the HTML of `toHTML` (`h-<blockId>`), its `level` and its plain `text`, for a table of contents of the host's own. Without `schema` it reads the core blocks and atoms, as `countDoc` does:

```tsx
import type { Editor } from 'quoin-editor';
import { headings } from 'quoin-editor/toc';

export const outline = ({ state }: Editor) => headings(state.doc, { schema: state.schema }).map(({ text }) => text);
```

## Read-only

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

const noop = () => {};

export function Reader({ blocks }: { blocks: QuoinBlock[] }) {
  return <BlockCanvas blocks={blocks} onChange={noop} readOnly aria-label="Article" />;
}
```

`readOnly` renders each block's `preview` with no inserters, menus, drag handles or editors. `onChange` is still required by the type, and is never called. `aria-label` names the document for assistive technology, and `className` and `id` go on the root element.

Because it draws previews and never editors, a block type registered without a `preview` has nothing to show here but its own label. Quoin warns once per type in the console when that happens, so give every type you render read-only a `preview`. It is not an error channel: `onError` is for the document, this is for the registration, so it goes to the developer and not to the reader.

## Theming

`quoin-editor/styles.css` is compiled Tailwind CSS v4. Every colour and every radius it draws with comes from a custom property under a `--quoin-` prefix. It ships a default for all of them, on `:root` for light and on `.dark` for dark:

```css
:root {
  --quoin-background: oklch(1 0 0);
  --quoin-foreground: oklch(0.145 0 0);
  --quoin-muted: oklch(0.97 0 0);
  --quoin-muted-foreground: oklch(0.54 0 0);
  --quoin-secondary: oklch(0.97 0 0);
  --quoin-secondary-foreground: oklch(0.205 0 0);
  --quoin-popover: oklch(1 0 0);
  --quoin-popover-foreground: oklch(0.145 0 0);
  --quoin-border: oklch(0.922 0 0);
  --quoin-input: oklch(0.922 0 0);
  --quoin-ring: oklch(0.45 0 0);
  --quoin-primary: oklch(0.205 0 0);
  --quoin-primary-foreground: oklch(0.985 0 0);
  --quoin-accent: oklch(0.97 0 0);
  --quoin-accent-foreground: oklch(0.205 0 0);
  --quoin-destructive: oklch(0.55 0.245 27.325);
  --quoin-info: oklch(0.55 0.17 250);
  --quoin-success: oklch(0.55 0.14 155);
  --quoin-warning: oklch(0.65 0.16 65);
  --quoin-radius: 0.625rem;
}

.dark {
  --quoin-background: oklch(0.145 0 0);
  --quoin-foreground: oklch(0.985 0 0);
  --quoin-muted: oklch(0.269 0 0);
  --quoin-muted-foreground: oklch(0.708 0 0);
  --quoin-secondary: oklch(0.269 0 0);
  --quoin-secondary-foreground: oklch(0.985 0 0);
  --quoin-popover: oklch(0.205 0 0);
  --quoin-popover-foreground: oklch(0.985 0 0);
  --quoin-border: oklch(1 0 0 / 10%);
  --quoin-input: oklch(1 0 0 / 15%);
  --quoin-ring: oklch(0.708 0 0);
  --quoin-primary: oklch(0.922 0 0);
  --quoin-primary-foreground: oklch(0.205 0 0);
  --quoin-accent: oklch(0.269 0 0);
  --quoin-accent-foreground: oklch(0.985 0 0);
  --quoin-destructive: oklch(0.704 0.191 22.216);
  --quoin-info: oklch(0.72 0.14 250);
  --quoin-success: oklch(0.74 0.15 155);
  --quoin-warning: oklch(0.79 0.15 65);
  --quoin-radius: 0.625rem;
}
```

Out of the box that is a neutral grey editor that works in both modes with nothing configured.

Those are the only custom properties the stylesheet declares. Apart from them it reads `--tw-*`, which belong to the Tailwind runtime it is compiled with, and the `--radix-*` values Radix writes on its own portalled elements while they are open. Tailwind's theme tokens are imported by reference, so the package resolves `--spacing`, `--text-base`, `--container-md` and the rest at build time and declares none of them on your page.

### The prefix arrived in 0.2.0

Until 0.2.0 these names were unprefixed: `--background`, `--accent`, `--border` and the rest. That was sold as free theme inheritance, and for a shadcn-style host it was. It also meant Quoin read whatever a host happened to keep under those names.

The stock Vite React + TypeScript template is the case that forced the change. It declares `--accent` as a bright purple and `--border` on `:root` with meanings of its own, so a fresh `npm create vite` project that installed Quoin drew the selected slash-palette row on that purple while keeping Quoin's own near-black `--accent-foreground`. The pair measures around 3.2:1, under the 4.5:1 that WCAG AA asks for, with nothing done wrong by the consumer.

A fallback form such as `var(--quoin-accent, var(--accent))` does not fix that, because the colliding value is exactly what gets read when only the unprefixed name is set. So the prefix is unconditional, and the inheritance is no longer free. If your theme stopped reaching Quoin when you upgraded, this is why, and the next section is how to hand it over again.

### Mapping your own tokens

Point the prefixed names at your own in one block on `.quoin`. The canvas root carries that class, and so do the menus, palette, select and dialog Quoin renders into `document.body`, so one rule covers all of them.

```css
.quoin {
  --quoin-background: var(--background);
  --quoin-foreground: var(--foreground);
  --quoin-muted: var(--muted);
  --quoin-muted-foreground: var(--muted-foreground);
  --quoin-secondary: var(--secondary);
  --quoin-secondary-foreground: var(--secondary-foreground);
  --quoin-popover: var(--popover);
  --quoin-popover-foreground: var(--popover-foreground);
  --quoin-border: var(--border);
  --quoin-input: var(--input);
  --quoin-ring: var(--ring);
  --quoin-primary: var(--primary);
  --quoin-primary-foreground: var(--primary-foreground);
  --quoin-accent: var(--accent);
  --quoin-accent-foreground: var(--accent-foreground);
  --quoin-destructive: var(--destructive);
  --quoin-info: var(--info);
  --quoin-success: var(--success);
  --quoin-warning: var(--warning);
  --quoin-radius: var(--radius);
}
```

`--quoin-info`, `--quoin-success` and `--quoin-warning` arrived in 0.4.0 and are read only by the callout block, for its rule and the wash behind it, never for type. If your own theme has no equivalent, leave those three out of the block and the defaults above stand; the rest of the editor does not touch them.

`--quoin-ring` colours the keyboard focus outline, which is solid and drawn at full strength, so it should reach 3:1 against both `--quoin-background` and `--quoin-popover`. A pale value, such as the grey many shadcn themes keep for `--ring`, fails that, so give `--quoin-ring` a value of its own that does.

That one block covers both modes: the tokens on the right already flip with your own dark class, and each mapping beats Quoin's `:root` and `.dark` defaults alike. Write it unlayered, or in a layer that sorts after `quoin`, so it outranks those defaults.

To change one token rather than adopt a whole theme, declare it on `:root`, and pair it with a `.dark` rule if you theme dark at all. Pinning a token on `:root` alone also beats Quoin's `.dark` value for it, which would freeze that one token in its light form.

```css
:root {
  --quoin-primary: oklch(0.55 0.2 260);
  --quoin-radius: 0.5rem;
}

.dark {
  --quoin-primary: oklch(0.72 0.17 260);
}
```

### Dark mode

Dark mode keys on a `.dark` class on an ancestor (for example `<html class="dark">`), not on `prefers-color-scheme`. Quoin redefines its own tokens under `.dark`, and its `dark:` variants follow the same class, so the two cannot disagree when a visitor's OS theme differs from your app's theme.

### Resets

Quoin does not reset your page. The stylesheet contains no `html`, `body`, heading, list or other element rules, and no universal `*` reset. Its own reset (box sizing, zero margins, unstyled lists and form controls) applies only inside a `.quoin` element: the canvas root, and the menus, palette, select and dialog that Quoin renders into `document.body`, which carry the class themselves. Your headings, paragraphs, lists and buttons keep whatever styles you gave them, or the browser's.

All of Quoin's own rules are in cascade layers, so an **unlayered** global reset of yours beats them. A host that ships one (Bootstrap's reboot, or a hand-rolled `* { margin: 0; padding: 0; border: 0 }`) will see Quoin's padding and borders vanish. Tailwind 4's preflight is itself layered and is fine. Either declare your reset in a layer that comes before Quoin's, or scope it away from `.quoin`:

```css
@layer reset, theme, base, components, quoin, utilities;

@layer reset {
  * { margin: 0; padding: 0; border: 0; }
}
```

```css
*:where(:not(.quoin, .quoin *)) { margin: 0; padding: 0; border: 0; }
```

The layer statement has to come before Quoin's stylesheet is parsed, so put it first in your own CSS or in an inline `<style>` in the document head.

### Tailwind, or no Tailwind

`quoin-editor/styles.css` is compiled output. Every value in it is already resolved, so it is a plain stylesheet, not a Tailwind plugin, and a project with no Tailwind at all can import it and be done.

If you do use Tailwind, both major versions work, and what you have to do differs:

| Your setup | What to do |
| --- | --- |
| **Tailwind v4** | Name the layer order and import Quoin into it, as [below](#cascade-layers-and-import-order). Without it Quoin's layer sorts last and its utilities beat yours. |
| **Tailwind v3** | Nothing. v3 emits its own utilities unlayered, and an unlayered rule beats a layered one whatever the order, so yours win over Quoin's by construction. |
| **No Tailwind** | Nothing. Import the stylesheet and the editor is styled. |

**On Tailwind v3, 0.2.0 is the first version that builds at all.** 0.1.1 and earlier emitted bare `@layer base` and `@layer utilities`, which the v3 PostCSS plugin refuses two different ways: importing the stylesheet from a component raises `'@layer base' is used but no matching '@tailwind base' directive is present`, and `@import`ing it from a stylesheet that does carry the `@tailwind` directives raises `TypeError: layerRule.nodes is not iterable`. Nesting everything under `quoin` in 0.2.0 removed both. If you worked around this by copying the stylesheet into `public/`, you can stop.

### Cascade layers and import order

Everything the stylesheet paints is inside one top-level cascade layer called `quoin`, with nested layers for its own theme, base and utilities inside it. Nothing it ships lands in a bare `theme`, `base`, `components` or `utilities` layer. It carries only the utilities Quoin's own components use, so the set of class names it can collide with at all is small and fixed.

That changed in 0.2.0, and it had to. Until then the package imported Tailwind's utilities into the bare `utilities` layer, so in a Tailwind host they appended into the host's own `utilities` layer, after the host's rules, and beat them on source order. One bare `.hidden { display: none }` from the package was enough to keep every element carrying `hidden md:block` hidden at every width, across the whole application.

The package cannot settle this on its own, because a browser orders layers by first appearance. A host whose own Tailwind is parsed first registers `theme`, `base`, `components` and `utilities` before `quoin` appears, so `quoin` sorts last and still wins. Name the order yourself, as the first thing in your stylesheet, and import Quoin into it:

```css
@layer theme, base, components, quoin, utilities;
@import "quoin-editor/styles.css" layer(quoin);
```

With `quoin` named before `utilities`, your own utilities outrank Quoin's, including the responsive ones, while Quoin still outranks your `components`.

Naming it first instead puts every layer of yours above the package:

```css
@layer quoin, theme, base, components, utilities;
@import "quoin-editor/styles.css" layer(quoin);
```

Layer position settles more than which utility wins. It also settles who owns a custom property both of you declare on `:root`, which is why it is worth deciding rather than inheriting. Quoin no longer declares any name Tailwind owns, because it imports Tailwind's theme by reference, but a package that does, including Quoin before 0.2.0, resizes every `p-4` on the page from whichever layer sorts last.

**Upgrading alone does not fix this.** Import 0.2.0 the way 0.1.1 was imported, with no layer statement of your own, and a host's `hidden md:block` still computes to `display: none`, exactly as before. The layer the package ships is what makes the fix available to you; the two lines above are what apply it.

Importing the stylesheet from a root layout, or with a plain `import 'quoin-editor/styles.css'` in JavaScript, gives you no say in where the layer lands. The bundler decides, and in a Tailwind host that usually means Quoin's layer sorts last. That is fine for an application with no Tailwind of its own, and it is what the samples in this README do for brevity. A Tailwind host should use the two lines above and drop the JavaScript import.

## Headless

`quoin-editor/headless` is the editing engine and its editable view, with none of the canvas UI. `useQuoinEditor` creates the editor and the controller that binds it to the page, and `EditorView` draws the document with one editable host per text block. It has no component or UI library dependency.

```tsx
'use client';

import { useState } from 'react';
import { EditorView, useQuoinEditor, type QuoinBlock } from 'quoin-editor/headless';

export function Notes() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  const controller = useQuoinEditor({ blocks, onChange: setBlocks });
  return <EditorView controller={controller} aria-label="Notes" />;
}
```

Everything in it is re-exported from the main `quoin-editor` entry too. Both entries carry a `'use client'` banner, so a React Server Component imports the pure functions, such as `toMarkdown` and `toHTML`, from `quoin-editor/engine`, which has none.

## Exports

From `quoin-editor`: `BlockCanvas`, `QuoinProvider`, `useQuoin`, `defineBlock`, `blockByType`, `paletteBlocks`, `coreBlocks`, `UploadField`, `FilePickerButton`, `useAutosave`, and everything in `quoin-editor/headless`, with their types (`QuoinBlock`, `QuoinEditorHandle`, `UploadFn`, `UploadResult`, `BlockDefinition`, `AnyBlockDefinition`, `BlockEditorProps`, `BlockPreviewProps`, `BlockCanvasProps`, `UploadFieldProps`, `FilePickerButtonProps` and others), and the [core block data shapes](#what-the-core-blocks-store): `MarkdownBlockData`, `CalloutBlockData`, `CodeBlockData`, `ImageBlockData`, `FileBlockData` and `CoreBlockData`.

From `quoin-editor/headless`: the editing engine and its editable view, with no canvas UI.

From `quoin-editor/engine`: the engine alone, with no React and no `'use client'` banner.

From `quoin-editor/table`: `tableExtension`, its `TableLabels` and `englishTableLabels`, and the table commands and cell selection.

From `quoin-editor/embed`: `embedExtension`, its `EmbedOptions`, `EmbedLabels` and `englishEmbedLabels`, and the `Unfurl` and `UnfurledLink` types.

From `quoin-editor/math`: `mathExtension`, its `MathOptions`, `MathLabels` and `englishMathLabels`, and the `RenderMath` type.

From `quoin-editor/toc`: `tocExtension`, its `TocOptions`, `TocLabels` and `englishTocLabels`, and `headings` with its `TocHeading` type.

From `quoin-editor/catalogue`: `catalogue`, every opt-in feature at once.

From `quoin-editor/styles.css`: the stylesheet, opt-in features included.

## Accessibility

What the test suite checks:

- axe runs over the canvas, the block cards, the inserter, the slash palette and the shortcuts reference.
- Controls carry accessible names, and the icons in the canvas, the block options menu, the inserter and the slash palette are hidden from assistive technology.
- Blocks reorder by keyboard, with announcements that name each block by label and position.
- Escape leaves an open block and returns focus to its Edit button.
- The default light and dark tokens keep the keyboard focus outline at 3:1 or more and highlighted-row text at 4.5:1 or more, and focusable controls draw the focus as an outline, which Windows forced colours mode keeps.

The checks are automated. A manual pass with NVDA and VoiceOver is not recorded yet.

Known gaps in 0.4:

- A markdown block is read as source. At rest it is plain text, so a screen reader reads the markdown characters as written.
- Keyboard drag with Space and the arrow keys can drop a block in place, and its announcement can name the wrong position. Use Move up and Move down in the block's options menu to reorder by keyboard.

## Stability

Quoin is 0.x. A minor version may contain breaking changes, and each one is listed in the [changelog](CHANGELOG.md). If you need stability, pin a minor with `~0.4.0`, which takes patch releases only.

## Licence

MIT. Copyright (c) 2026 Amine Sboui. See [LICENSE](LICENSE).
