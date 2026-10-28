---
title: Custom blocks
description: Add block types of your own with defineBlock, whose editor and preview are plain React components, and read uploads from inside them.
---

# Custom blocks

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
| `label` | yes | The name shown in the block menu and the slash menu. |
| `icon` | yes | A [lucide](https://lucide.dev) icon component. Quoin depends on `lucide-react@^1`; add that same major to your own dependencies to import icons, so you do not end up with a second copy and mismatched icon types. |
| `editor` | one of the two | The editing surface, opened by a double click, the block's Edit button or Enter on the selected block, and closed by Escape. It receives the props listed below. Omit it for a block that is never editable here. |
| `preview` | one of the two | What the block shows when its editor is closed, and everywhere on a read-only canvas. It receives the props listed below. Omit it for an edit-only block. |
| `initialData` | no | Seeds `data` when a block of this type is inserted. It is checked against the editor's data type. |
| `inSlashPalette` | no | Set to `false` to keep the type out of the slash menu. Defaults to `true`. |
| `alwaysEditing` | no | Renders the editor permanently on an editable canvas, instead of the preview. |

An editor receives these props, all passed by the canvas; `onInsertBlock` and `onDone` are optional in the type:

| Prop | Purpose |
| --- | --- |
| `data` | The block's data. |
| `onChange` | Writes the whole next `data`, not a patch. Everything written while the editor is open undoes in one step. |
| `blockId` | The id of the block. |
| `index` | The block's position in the document, its index in the `blocks` array counting from 0, kept current as blocks move. Only a block whose position changed draws again, so reading it costs nothing while another block is typed in. |
| `onRemove` | Removes the block as one undo step and puts the caret where deleting the selected block puts it: at the end of the block above, or at the start of the one below when it was first. |
| `onInsertBlock` | Inserts a new block of the given type after this one. |
| `onDone` | Closes the editor and leaves the block selected. |

A preview receives `data`, `blockId` (passed by the canvas and by `QuoinView`, though optional in the type) and, on an editable canvas only, `onChange`. That `onChange` writes through the same path as an editor's, with one undo step per block, so a preview can hold a control that changes the block without opening the editor, such as a checkbox. It is not passed on a read-only canvas or in `QuoinView`, so disable or hide such a control without it:

```tsx
import type { BlockPreviewProps } from 'quoin-editor';

function TodoPreview({ data, onChange }: BlockPreviewProps<{ done: boolean }>) {
  return (
    <input
      type="checkbox"
      aria-label="Done"
      checked={data.done}
      disabled={onChange === undefined}
      onChange={() => onChange?.({ done: !data.done })}
    />
  );
}
```

Supply `editor`, `preview` or both. Omitting both is a type error, because such a block could only ever draw its own label.

**Omit `editor` for a block that is not yours to edit** here: content that belongs to a server-side record, a generated summary, an audit trail. A click or the arrows still select the block as a whole, so it can be moved, copied or deleted, but it shows no Edit button and never opens an editor, and `preview` becomes required because it is the only thing left that can draw the block.

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

## What the core blocks store

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

- **The callout's prose is `body`, not `text`.** It is typed in place, as inline markdown, like a paragraph. `tone` is one of `info`, `tip`, `warning`, `success` or `danger`, each drawn in its own colour; anything else falls back to the neutral border and fill.
- **Markdown blocks store markdown source, not rendered HTML.** Each holds one line: a paragraph, a heading, a list item, a task or a quote. The canvas draws it formatted and writes the source back only for the blocks the author edited. Once the author sets them, a text block also keeps `align`, `color` and `background`.

The optional fields are written after a block's first save, and only once set: an image's `caption` when the author types one, its `width` and `height` once the uploaded bytes have been measured, its `url`, `align` and `widthPercent` when the author links, aligns or resizes it, a file's `size` when the upload reports it and its `mime` when the file declares a type. `src/blocks/data.test.ts` holds the table above to the declared types and to the keys a file upload writes, and the image and file blocks' tests check the exact data each of their controls writes.

## Reaching uploads from a custom block

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

A preview is also how a read-only canvas can draw text blocks your own way. Register a `MARKDOWN` definition last with your preview, and a read-only canvas draws every `MARKDOWN` block with it. An editable canvas keeps drawing text blocks itself, since they are typed into in place, and warns about the definition in development:

```tsx
import { blockByType, coreBlocks, defineBlock, type AnyBlockDefinition, type BlockPreviewProps } from 'quoin-editor';

function MyMarkdownPreview({ data }: BlockPreviewProps) {
  return <article>{String(data.markdown ?? '')}</article>;
}

const core = blockByType(coreBlocks, 'MARKDOWN');

export const blockTypes: AnyBlockDefinition[] = core
  ? [...coreBlocks, defineBlock({ ...core, preview: MyMarkdownPreview })]
  : coreBlocks;
```

Replace the `<article>` with whatever renderer you use. For HTML that matches the canvas, `toHTML` from `quoin-editor/engine` and `QuoinView` from `quoin-editor/view` already render every core block.
