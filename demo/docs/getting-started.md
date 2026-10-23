---
title: Getting started
description: Install quoin-editor, render a BlockCanvas, import its stylesheet and see what each entry adds to a page.
---

# Getting started

## Install

```bash
npm install quoin-editor
```

```bash
yarn add quoin-editor
```

Quoin needs React 18.2 or later (React 19 is supported) and TypeScript 5.4 or later if you use TypeScript. The block registry relies on the built-in `NoInfer` utility type, which arrived in 5.4. `npm run check:consumer` typechecks the packed package, every entry and the samples of the README and of these pages on React 18 and 19 with TypeScript 5.4.

**Tailwind is not required, and either major version works.** See [Tailwind, or no Tailwind](https://amineseboui.github.io/quoin-editor/docs/theming/#tailwind-or-no-tailwind) for the one thing a v4 host has to do.

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

A document is an array of `QuoinBlock`, each `{ id, type, data }`. Text blocks, `MARKDOWN`, hold one line of markdown each: a paragraph, a heading, a list item, a task, a quote. The canvas draws that markdown formatted as you type, and `onChange` hands back the array with the edited block's markdown rewritten and every other block the same object it was. `CALLOUT`, `CODE`, `IMAGE`, `FILE`, `DIVIDER` and `TOGGLE` ship with the canvas too; tables, embeds and bookmarks, math and tables of contents are [opt-in features](https://amineseboui.github.io/quoin-editor/docs/extensions/).

The main entry point is marked `'use client'`, so render `BlockCanvas` from a client component. To draw a document on a server, use [`quoin-editor/view`](https://amineseboui.github.io/quoin-editor/docs/server-rendering/).

If your application has Tailwind of its own, import the stylesheet from your CSS into a layer you have named instead of from JavaScript, so you decide which of the two wins. See [Cascade layers and import order](https://amineseboui.github.io/quoin-editor/docs/theming/#cascade-layers-and-import-order).

## What a page downloads

Quoin depends on five Radix primitives, `lucide-react` for its icons, and `clsx` for class composition. A page downloads only the entries it imports, and `npm run check:size` holds each to a gzip budget (`scripts/package-entries.mjs`):

- The canvas, `quoin-editor`, is held under 155 kB gzip, `quoin-editor/headless` under 70 kB and `quoin-editor/engine` under 52 kB.
- Each opt-in feature adds between about 1.7 kB (stats, or the table of contents) and 9.6 kB (tables) to the canvas, all of them together about 30 kB. The emoji dataset, about 42 kB, loads only when the `:` menu or the emoji picker first opens.
- Collaboration, `quoin-editor/yjs`, adds about 8 kB and needs `yjs` installed beside it, an optional peer dependency. Showing collaborators, `quoin-editor/presence`, adds about 4.5 kB more, comments, `quoin-editor/comments`, about 6.5 kB, and AI actions, `quoin-editor/ai`, about 8 kB.
- The read-only view for a server, `quoin-editor/view`, is about 21 kB on its own, most of it the markdown parser it shares with the engine. The diff of two versions, `quoin-editor/diff`, is about 26 kB, and the Word export, `quoin-editor/docx`, about 25 kB on its own, about 7 kB beside the engine.

The npm tarball is larger, about 2.0 MB, because it carries ESM and CommonJS builds with their sourcemaps. If you want the text editing and none of the UI, [`quoin-editor/headless`](https://amineseboui.github.io/quoin-editor/docs/headless/) has no component or UI library dependency at all.
