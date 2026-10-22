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

Quoin depends on five Radix primitives, `lucide-react` for its icons, and `clsx` for class composition. A page downloads only the entries it imports: the canvas, `quoin-editor`, is held under 155 kB gzip, `quoin-editor/headless` under 70 kB and `quoin-editor/engine` under 52 kB. Each opt-in feature adds between about 1.7 kB (stats, or the table of contents) and 9.5 kB (tables) to the canvas, all of them together about 29 kB, and the emoji dataset, about 42 kB, loads only when the `:` menu or the emoji picker first opens. Collaboration, `quoin-editor/yjs`, adds about 8 kB and needs `yjs` installed beside it, an optional peer dependency; showing collaborators, `quoin-editor/presence`, adds about 4 kB more, and comments, `quoin-editor/comments`, about 6 kB. The npm tarball is larger, about 1.6 MB, because it carries ESM and CommonJS builds with their sourcemaps. If you want the text editing and none of the UI, [`quoin-editor/headless`](#headless) has no component or UI library dependency at all.

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

### A collaborative canvas

A canvas given a collaboration extension takes its content from the shared document, so it is uncontrolled: pass the starting blocks, or the shared document's, once, and keep echoing `onChange` as above. The canvas still recognises its own output, but while the shared document is connected it ignores any other array you hand to `blocks`, and says so in development. The connection opens when the canvas mounts and closes when it unmounts.

An editor with no canvas, such as one made with `createEditor` from `quoin-editor/engine`, connects when you call `editor.mount()`. Call the function it returns to disconnect; `editor.destroy()` disconnects too.

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

On an editable canvas a press on an embed selects the block rather than the frame, which is out of the tab order; Enter on the selected embed moves focus into the frame. A read-only canvas draws the frames as they are, in the tab order. Without `unfurl`, a bookmark shows its address and domain, as it does when `unfurl` finds nothing; an `unfurl` that throws or rejects is reported to the canvas's `onError`, and is not asked again for that bookmark and address. Every string a bookmark holds is drawn as text, and its picture only from an http or https address.

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

`$$` and a space at the start of a paragraph, or `/` and Block equation, make a math block and open its editor, a popover with the LaTeX and a live preview. A click on a math block, or Enter on one selected as a whole, opens it too: Mod+Enter or Save stores the LaTeX, Enter starts a new line, and Escape keeps what was there, each handing focus back to the block. A formula typed between dollars, such as `$x^2$`, becomes a formula in the line as its closing dollar is typed, wherever the markdown reads one, so `$5 and $10` stays text; Backspace right after gives the dollars back. A dollar in code never opens or closes a formula, and no formula runs across the edge of a link or of other formatting. A formula typed between backticks, such as `` `$x$` ``, stays a formula inside the code, because it converts before the closing backtick makes the code. Backspace right after a formula selects it, and a second Backspace deletes it; Shift with an arrow steps a selection over it whole, and a drag or a Shift+click that ends on it takes it whole. A click on a formula, or Enter while it is selected, opens the same editor, where Enter stores and Shift+Enter starts a new line, and Inline equation in the `/` menu opens it at the caret, writing the formula there once a LaTeX is stored and leaving the text as it was otherwise; Enter with the caret after a formula starts a new line as anywhere else, and Shift+click extends the selection. A press outside the editor, or Tab out of it, stores the LaTeX too, and a press leaves focus where it lands. Storing an empty formula removes it, and an empty block shows "Empty equation". Each store is one undo step. A read-only canvas draws blocks and formulas and opens no editor.

### Table of contents

`quoin-editor/toc` draws `TOC` blocks as a navigation named "Table of contents" that lists the headings of the document as links, nested by level, and follows them as they are written. A heading with no text is left out, and a skipped level nests one deep, as in the table of contents `toHTML` writes. `/` and Table of contents inserts one; with no headings it shows "Add headings to build the table of contents". A second table of contents in the same document, and any after it, is named with its number, "Table of contents 2", so that each navigation has a name of its own.

Each entry links to `#block-<id>`, the fragment a copied link to the block ends with. A click on an entry, or Enter on it, puts the caret at the end of its heading and scrolls the heading into view, smoothly unless the reader prefers reduced motion; Mod+click and a middle click leave the link to the browser, which opens the page at the heading in a new tab. On an editable canvas the arrows, or a press beside the entries, select the block as a whole, Enter then moves focus to its first entry, Tab and Shift+Tab walk the entries and go back to the block past either end, and Escape goes back to the block; the entries stay out of the page's tab order. A read-only canvas keeps them in it, and a click moves focus to the heading without changing the document. When a change from elsewhere moves the heading of the focused entry, focus follows its entry, and when it takes the heading away, focus goes back to the block.

`headings(doc, { schema })` lists the headings the block shows, each with its `blockId`, its `anchor` in the HTML of `toHTML` (`h-<blockId>`), its `level` and its plain `text`, for a table of contents of the host's own. Without `schema` it reads the core blocks and atoms, as `countDoc` does:

```tsx
import type { Editor } from 'quoin-editor';
import { headings } from 'quoin-editor/toc';

export const outline = ({ state }: Editor) => headings(state.doc, { schema: state.schema }).map(({ text }) => text);
```

### Mentions

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

### Emoji

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

### Find and replace

`quoin-editor/find` adds a find and replace panel, which Mod+Shift+F opens from the canvas, read-only or not. The query starts as the selected text when the selection lies inside one line, and focus goes to it. Every match in the text of the document is marked, in paragraphs, headings, list items, quotes, callouts, table cells and captions alike: formatting never breaks a match, and a formula or a mention stands between matches. Match case, Whole word (letters, digits and underscores of any script) and Regular expression are toggle buttons; a pattern that cannot be read says so instead of finding anything. The panel counts the matches, up to 1,000, and announces the count once typing rests.

Enter and Shift+Enter in the query move to the next and the previous match, wrapping, and bring it into view without taking focus from the panel. Replace, or Enter in the replacement field, replaces the current match and moves on; Replace all replaces every match in one undo step. Each replacement takes the formatting of the start of the match it replaces, and in regex mode `$&` and `$1` to `$9` stand for the match and its groups. The panel is not modal: the canvas stays editable and the marks follow each edit. Escape, or its close button, closes it and selects the current match, or puts the caret back where it was. A read-only canvas finds without replacing.

```tsx
import { findExtension, findMatches } from 'quoin-editor/find';

const extensions = [findExtension({ labels: { findAndReplace: 'Rechercher et remplacer' } })];
```

`findMatches(doc, query, { caseSensitive, wholeWord, regex })` returns `{ matches }`, each `{ block, region, from, to }` in document order, or `{ error }` for a pattern that cannot be read, and never throws. `replaceMatches(search, matches, replacement)` is the command that replaces them in one transaction.

### Stats, a character limit, focus mode and typography

`quoin-editor/stats` shows the words, characters and blocks of the document under it, counted again at most once per animation frame and each block only when it changed. It counts what was written: the text of every block as `countText` reads it, except that the cells of a table count without the separators between them, and an image, a file, an embed or a bookmark counts nothing, since its name, address or title comes from an upload or the host. Its other parts are off until asked for:

- `limit`: the most characters the document may hold, counted as the footer counts them, so attaching an image, a file, an embed or a bookmark never counts against it, and an upload or an unfurl that lands at the limit is written. An edit that would leave more than the limit, and more than there were, is refused whole, a paste, a drop or a composition included, and the reason is announced once; a deletion always goes through, so a document loaded over the limit can still be edited down. The footer then shows the count against the limit, as a polite live region from 90 percent of it. Undo, redo and the blocks the host supplies are never refused.
- `focusMode`: dims every block but those the selection touches, and the blocks they are nested in, to 40 percent while the canvas is editable and holds focus. Nothing is hidden from assistive technology.
- `typography`: turns quotes, ellipses, arrows and the like into their typographic forms as they are typed; `{ dashes: 'em' }` or `'en'` turns a double hyphen into a dash too. Nothing is turned inside a formula or a code span still being typed: after a `$` that opens a formula, or a run of backticks that opens a code span, with nothing yet to close it, `$f'(x)$` keeps its prime and `` `a -> b` `` its arrow.

```tsx
import { statsExtension, useEditorStats } from 'quoin-editor/stats';

const extensions = [statsExtension({ limit: 280, focusMode: true, typography: { dashes: 'em' } })];
```

`footer: false` leaves the footer out and keeps the rest. `useEditorStats(controller)` returns `{ characters, words, blocks }` for a count of your own, with the controller of a `BlockCanvas` handle or, inside the canvas, of `useViewController()`.

### Collaborating through Yjs

`quoin-editor/yjs` syncs a canvas through a [Yjs](https://yjs.dev) document, with an undo that takes back only your own changes. Install `yjs` beside the package (it is an optional peer dependency) and bring your own provider, such as `y-websocket`; Quoin never opens a connection itself.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';
import { useEffect, useState } from 'react';
import type * as Y from 'yjs';

// The part of a provider such as y-websocket's WebsocketProvider this needs: whether it has synced, and its event.
type Provider = {
  synced: boolean;
  on(event: 'sync', listener: (synced: boolean) => void): void;
  off(event: 'sync', listener: (synced: boolean) => void): void;
};

export function SharedEditor({ doc, provider, starting }: { doc: Y.Doc; provider: Provider; starting: QuoinBlock[] }) {
  const [synced, setSynced] = useState(provider.synced);
  const [extensions] = useState(() => [collaborationExtension(yjsCollaboration({ doc, user: { name: 'Ada' } }))]);
  const [blocks, setBlocks] = useState(starting);
  useEffect(() => {
    const listen = (done: boolean) => {
      if (done) setSynced(true);
    };
    provider.on('sync', listen);
    return () => provider.off('sync', listen);
  }, [provider]);
  // Connect only once the provider has synced, so an empty document is seeded by one client alone.
  if (!synced) return null;
  return <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} />;
}
```

The whole document lives in one `Y.Text`, `doc.getText('quoin')` (`field` names another). Each block starts with an embedded `Y.Map` holding its `id`, `type`, `indent` and `attrs` (a `Y.Map` of its own, so two people changing different attrs of one block both keep their change), and each region with an embed naming it (`{ r: 'text' }`), followed by its characters, whose formatting attributes are the marks (`{ bold: true }`, `{ link: { href } }`, `{ 'comment:c1': true }`); atoms are embeds `{ atom, attrs }`. Blocks and marks the canvas does not know are kept as they are. Pressing Enter puts a block marker into the text and Backspace at the start of a line takes one out, so what someone else types in that line at the same moment stays where they typed it. Edits that cross at the same moment can leave the text in a shape no single client wrote (characters outside any region, two markers of one block); every client reads such a text the same way, without writing anything back, so all of them still show the same document. Text someone types into a block that another person deletes at the same moment is kept: it shows up at the end of the region before it in the document, which can be a block above a divider or an image. When a region later appears between that text and the region it shows up in, as when a code block above it becomes a paragraph, the text moves into the new region, on every client alike. A text block whose region another edit took out reads as empty, and typing into it writes the region again. When the canvas connects, a shared document with content replaces the canvas's blocks, and an empty one takes them; two clients that connect to an empty document before their provider has synced would both fill it, so connect after the provider's first sync, or pass `seed: false` to all clients but one. Moving a block takes it out of the text and writes it again where it goes, so an edit someone makes inside a block being moved at the same moment is lost; every client still ends with the same document. Undo and redo go through a `Y.UndoManager` that tracks this client's changes alone, grouped as the canvas groups typing. One `yjsCollaboration` serves one editor at a time: build it with the editor, as above, and a second editor it is given stays unconnected and is reported to its `onError` option. Recent releases of `lib0`, which `yjs` depends on, declare types that need TypeScript 5.7: on an older TypeScript, set `skipLibCheck` or hold `lib0` at 0.2.111.

### Showing who else is here

`quoin-editor/presence` shows the people your provider's awareness knows: each one's selection tinted with their colour, their caret with their name, small avatars of their initials in a narrow gutter beside the block they are in, and, through the canvas's live region, who joined and who left. It is an entry of its own, so a worker or a server that only syncs through `quoin-editor/yjs` loads none of the canvas. Give `yjsCollaboration` the provider's awareness, such as `provider.awareness` of `y-websocket`, and a `user` with a name and a colour; Quoin never makes one up, and a colour that is not a plain CSS colour is left out. Pick colours that white text reads well on, since names and initials are drawn in white.

```tsx
import { presenceExtension } from 'quoin-editor/presence';
import { collaborationExtension, yjsCollaboration, type YjsAwareness } from 'quoin-editor/yjs';
import { useState } from 'react';
import type * as Y from 'yjs';

export function useSharedExtensions(doc: Y.Doc, awareness: YjsAwareness) {
  const [extensions] = useState(() => {
    const user = { name: 'Ada Lovelace', color: '#b91c1c' };
    const collaboration = yjsCollaboration({ doc, awareness, user });
    return [collaborationExtension(collaboration), presenceExtension(collaboration)];
  });
  return extensions;
}
```

Each client writes `{ user: { name, color }, selection }` to its awareness state, the selection's ends given by block id, region and offset with a Yjs relative position beside them, so a caret stays on its character while others type before it. The selection is written at most every 50 ms, and only while the canvas is focused and editable: on blur or in read-only it is cleared, so others stop showing it. Carets are drawn over the text rather than in it, so they never change how your own caret moves, what you select, copy or compose; they are hidden from assistive technology and take no pointer or focus. A collaborator's name fades after 2 seconds without a move, and a long name is cut short with an ellipsis (the avatars' accessible name keeps it whole). The avatars' gutter takes 24 px at the end of every line of a canvas with presence, whether or not anyone else is there, so the text never reflows as people come and go; leave room for it in a narrow layout. A name label that reaches the canvas's side is cut off there, and a caret in a part of the document that scrolls on its own, such as a wide table, stays inside it and scrolls with it. Nothing a collaborator does scrolls the page or moves the focus, and an announcement stays in the live region until you, not a collaborator, change something. Strings come from `PresenceLabels` (English in `englishPresenceLabels`), overridden through `presenceExtension(collaboration, { labels })`.

### Comments

`quoin-editor/comments` anchors comment threads to text. The threads are yours: Quoin stores only the anchor, a `comment` mark whose `id` is the thread's (`<span data-comment="t1">` in markdown), and asks your callbacks for everything else. Keep the threads in a store from `createCommentThreads(initial)` and call its `set(threads)` whenever your copy changes, after a reply is saved or when a collaborator resolves a thread; the canvas follows without a remount.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { commentsExtension, createCommentThreads, type CommentThread } from 'quoin-editor/comments';
import { useState } from 'react';

type Props = {
  blocks: QuoinBlock[];
  onChange: (next: QuoinBlock[]) => void;
  initial: CommentThread[];
  saveReply: (threadId: string, body: string) => Promise<CommentThread[]>;
};

export function ReviewedEditor({ blocks, onChange, initial, saveReply }: Props) {
  const [threads] = useState(() => createCommentThreads(initial));
  const [extensions] = useState(() => [
    commentsExtension({
      threads,
      currentUser: { id: 'u1', name: 'Ada Lovelace' },
      onCreate: async () => {
        const thread: CommentThread = { id: crypto.randomUUID(), resolved: false, comments: [] };
        threads.set([...threads.get(), thread]);
        return thread.id;
      },
      onReply: async (threadId, body) => threads.set(await saveReply(threadId, body)),
      onResolve: async (threadId) => {
        threads.set(threads.get().map((t) => (t.id === threadId ? { ...t, resolved: true } : t)));
      },
      onDelete: async (threadId) => {
        threads.set(threads.get().filter((t) => t.id !== threadId));
      },
    }),
  ]);
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

The bubble toolbar's Comment button, or Mod+Alt+M, calls `onCreate({ anchorText, blockId })` for the selected text (`blockId` is the first block of a selection across blocks). While it is pending the text is drawn as a pending anchor, which follows any edits made meanwhile; when it resolves with an id, the `comment` mark is added over that text in one undo step, a part in each block of a selection across blocks, and, if the selection has not moved since, the new thread opens with focus in its field for the first comment, which goes to `onReply`. When it rejects, the pending anchor goes and the canvas's `onError` hears why. An edit that splits the text meanwhile, such as Enter inside it, leaves a part in each block, and when all of the text was deleted before your host answered, `onError` hears so with the thread's id, so you can delete the empty thread.

Anchors are tinted with `--quoin-comment`, translucent so that overlapping threads stack deeper, and underlined with `--quoin-comment-edge`; the anchor of the open thread takes `--quoin-comment-active` and a thicker rule. Body and palette text read at 4.5:1 or more on every tint in the light and dark themes, so the tints stay pale and the rule carries the difference. Clicking an anchor opens its thread in a popover beside it, or a list to choose from where several threads overlap, without taking focus from the text, so typing goes on where the click put the caret. Mod+Alt+M with the caret in an anchor opens it with focus in its reply field, and moves focus into a thread a click already opened. The popover is a dialog that leaves the canvas editable; Escape closes it and, when focus was inside, gives focus back to the text. An anchor whose thread your store does not know, or has resolved, is drawn as a plain tint and opens nothing. When the text of an open thread is deleted, by you or a collaborator, the popover stays open as "Text removed" with what you were writing, until you close it.

On a canvas 800 px wide or more the open threads are listed beside the text, each level with the block its text starts in and pushed down when they would overlap; positions follow edits, resizes and loading images, and nothing scrolls the page. A thread opens in place in the list, and Escape folds it back. On a narrower canvas a small button beside each block with threads, and one after them, opens a sheet over the foot of the page that lists them. The room is reserved at the end of every line whenever comments are on, so the threads never cover the text, and the canvas grows as tall as the list beside it, so the list never runs over the page below; the list is left out of a selection or a copy of the page: 272 px on a wide canvas, 36 px on a narrow one, and presence's 24 px gutter sits inside it. Threads whose text has all been deleted are listed after the others as "Text removed", and can still be resolved or deleted.

Resolve and Delete call `onResolve` or `onDelete`, then take the thread's marks off in one undo step. Undo puts the marks back, and the thread stays as your host left it: a resolved thread's anchor comes back as a plain tint. A thread resolved or deleted here leaves the lists at once, before your store says so. A failed call goes to `onError` and leaves the document unchanged. A read-only canvas shows threads and takes replies but has no Resolve or Delete, since those change the document. Bodies are drawn as plain text with their line breaks, never as markdown or HTML; Mod+Enter or Send sends a reply. With `quoin-editor/yjs`, anchors reach collaborators like any other mark, and their threads come from each client's own store. Strings come from `CommentsLabels` (English in `englishCommentsLabels`), overridden through `commentsExtension({ labels })`.

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

`--quoin-info`, `--quoin-success` and `--quoin-warning` arrived in 0.4.0 and are read only by the callout block, for its rule and the wash behind it, never for type. If your own theme has no equivalent, leave those three out of the block and the defaults above stand; the rest of the editor does not touch them. `--quoin-comment`, `--quoin-comment-active` and `--quoin-comment-edge` arrived with comments and mark the text threads are anchored to; keep the two tints pale enough for your body and palette text.

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

From `quoin-editor/mention`: `mentionExtension`, its `MentionOptions`, `MentionLabels` and `englishMentionLabels`, and the `Mention`, `MentionResult` and `MentionSearch` types.

From `quoin-editor/emoji`: `emojiExtension`, its `EmojiOptions`, `EmojiLabels` and `englishEmojiLabels`, `loadEmojiData` with its `EmojiData`, and the `Emoji` and `EmojiGroup` types.

From `quoin-editor/find`: `findExtension`, its `FindOptions`, `FindLabels` and `englishFindLabels`, `findMatches` and `replaceMatches`, and the `SearchOptions`, `FindQuery`, `FindMatch` and `FindResult` types.

From `quoin-editor/stats`: `statsExtension`, its `StatsOptions`, `StatsLabels` and `englishStatsLabels`, and `useEditorStats` with its `EditorStats` type.

From `quoin-editor/yjs`: `yjsCollaboration` with its `YjsCollaborationOptions`, `YjsCollaboration`, `CollaborationUser`, `YjsAwareness` and `Seed` types, and `collaborationExtension`, `applyRemote` and the `CollaborationAdapter` and `CollaborationHistory` types for an adapter of your own. Like the engine entry it has no `'use client'` banner and needs no DOM.

From `quoin-editor/presence`: `presenceExtension` with its `PresenceOptions` and `PresenceLabels` types, and `englishPresenceLabels`.

From `quoin-editor/comments`: `commentsExtension` with its `CommentsOptions` and `CommentsLabels` types, `englishCommentsLabels`, and `createCommentThreads` with the `CommentThreads`, `CommentThread`, `ThreadComment`, `CommentAuthor` and `CommentUser` types.

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
