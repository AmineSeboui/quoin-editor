---
title: Headless
description: The editing engine and its editable view without the canvas UI, for a host that draws its own chrome.
---

# Headless

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

## Files dropped or pasted

`useQuoinEditor` hands files that are pasted or dropped to `onFiles(files, at)` and inserts nothing itself; a paste or a drop that also carries text or HTML goes in as that text instead. `at` is the caret for a paste, or `null` when the selection is not in text, such as a block selected as a whole, and for a drop on text the place it lands. A drop on a block with no text of its own, such as an image or a divider, gives that block with an empty region and offset 0, `{ block, region: '', offset: 0 }`, so check `region` before you insert text at `at`.

## Keep renderers stable

`EditorView` keeps the element it drew for each block until the block or the `renderers` object changes, so a keystroke redraws one block. Define the `renderers` object and its components once, at module level or in a `useMemo`: a new object on every render redraws every block on every keystroke, and a component declared inside a render is a new type each time, so React mounts each block it draws again and the block loses its state.

## The Mod key

The editor `useQuoinEditor` creates and its `ViewController` each default to the same platform check, so they agree: Mod is Command on a Mac and Control elsewhere for both. A host that calls `createEditor` and builds a `ViewController` itself and passes `isMac` to one must pass the same `isMac` to the other: the editor reads it for its keymap and the controller for the keys it handles itself, and the two must agree.

## Internal names

The `historyGroup` transaction meta, which makes consecutive changes of one group a single undo step as typing does, and the `data-quoin-native` attribute, which marks an element whose presses belong to it and never start a block selection, are internal. Neither is exported, and either can change in a minor release.
