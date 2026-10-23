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
