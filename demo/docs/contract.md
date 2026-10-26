---
title: The controlled contract
description: BlockCanvas behaves like a controlled input: blocks in, onChange out, with autosave, loading, discarding and undoing a deletion in your own code.
---

# The controlled contract

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

Stores that clone the document on the way through, such as a Redux or Zustand round trip or a server-synced store, are supported too. The canvas recognises an array it emitted however late it comes back, and a structural copy of one as long as it is within the last 256 changes the canvas reported.

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

`save` may return anything, so a mutation, an axios call or a `fetch` that resolves to a body goes straight in with no wrapper to discard the value. A save fails by rejecting, or by resolving to an explicit `{ ok: false }`; everything else, `undefined` included, is a success. `status` moves `idle` to `saving` to `saved`, or to `retrying` while it backs off, and `retry()` tries again at once. One save runs at a time, with the newest payload queued behind it, and a pending edit is saved at once when the component unmounts or the page is hidden (`flush()` does the same on demand). Retries stop after `maxRetries` (default 8) or when `isRetryable(error)` returns false; `status` is then `failed` and `error` holds the reason.

## A collaborative canvas

A canvas given a collaboration extension takes its content from the shared document, so it is uncontrolled: pass the starting blocks, or the shared document's, once, and keep echoing `onChange` as above. The canvas still recognises its own output, but while the shared document is connected it ignores any other array you hand to `blocks`, and says so in development. The connection opens when the canvas mounts and closes when it unmounts. [Collaboration](https://amineseboui.github.io/quoin-editor/docs/collaboration/) covers the adapter itself.

An editor with no canvas, such as one made with `createEditor` from `quoin-editor/engine`, connects when you call `editor.mount()`. Call the function it returns to disconnect; `editor.destroy()` disconnects too.

## Loading, undoing and discarding

You can hand the canvas a new `blocks` array at any time to load, undo or merge a document. A new array replaces what the canvas shows when it differs from the last array you supplied.

A caret in a block the new array changes stays on its character: text added or removed before it, after it or on both sides moves it with the text, and a caret inside text you removed goes to where that text was.

When you echo `onChange` back into `blocks`, as every sample above does, the last array you supplied is the edited document, so `setBlocks(saved)` differs from it and resets the canvas with nothing more to do.

The case that needs care is a host that does not echo edits back. There, the last array you supplied is still the original, and an array structurally equal to it is ignored: a "discard changes" button that re-supplies the original document does nothing. The same goes for restoring a copy of a state from the last 256 changes the canvas reported, which reads as a late echo of the canvas's own output. To force a reset, remount the canvas with a React `key`. The sample below uses a `key` so it works either way.

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

The structural comparison reads each block's `id`, `type`, `indent` and `data`, and compares `data` deeply, so a host that rebuilds nested data on every render, such as a table's rows, hands back an array equal to the one before and resets nothing.

## Undoing a deletion

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

`BlockCanvas` builds its configuration from `blockTypes`, `upload`, `resolveAssetUrl`, `onError`, `highlight` and `labels`, and memoises it on their identity. Pass a new array, object or function on every render and the memo is busted, which re-renders everything that reads the configuration. Keep `blockLink` stable for the same reason. `extensions` are read once, when the canvas mounts: remount it with a new `key` to change them.

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
