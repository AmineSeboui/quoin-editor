---
title: Read-only and server rendering
description: Draw a document read-only on the canvas, in a React Server Component with QuoinView, as a diff of two versions with QuoinDiff, or as a Word file with toDocx.
---

# Read-only and server rendering

## A read-only canvas

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import 'quoin-editor/styles.css';

const noop = () => {};

export function Reader({ blocks }: { blocks: QuoinBlock[] }) {
  return <BlockCanvas blocks={blocks} onChange={noop} readOnly aria-label="Article" />;
}
```

`readOnly` draws the document with no menus, toolbars, drag handles or editors: the core blocks as the editable canvas draws them, and each block type of your own through its `preview`. Text can still be selected and copied. `onChange` is still required by the type, and is never called. `aria-label` names the document for assistive technology, and `className` and `id` go on the root element.

Because it draws previews and never editors, a block type registered without a `preview` has nothing to show here but its own label. Quoin warns once per type in the console when that happens, so give every type you render read-only a `preview`. It is not an error channel: `onError` is for the document, this is for the registration, so it goes to the developer and not to the reader.

## On the server

`quoin-editor/view` draws a document read-only with no hook, effect or browser API, so it renders in a React Server Component, in a static export and in plain Node. It carries no `'use client'` banner and loads none of the canvas.

```tsx
import type { QuoinBlock } from 'quoin-editor/engine';
import { QuoinView } from 'quoin-editor/view';

export function Article({ blocks }: { blocks: QuoinBlock[] }) {
  return <QuoinView blocks={blocks} className="article" resolveAssetUrl={(key) => `/files/${key}`} />;
}
```

`QuoinView` writes the same HTML as `toHTML` with the same options (`resolveAssetUrl`, `renderMath`, `embeds`, `embedProviders`, `frameTitle` and `taskLabel`), inside a `div` with the class `quoin-view` and your `className`; with `quoin-editor/styles.css` loaded its links take Quoin's link colour in both themes, never the browser's blue. Toggles are native `details`, open as their blocks are, and pictures load lazily, so a server render preloads none of them. `highlight` takes the canvas's code highlighter and draws its tokens on the server; a token colour that is not a single colour value is left out. A block type of your own is drawn by the `preview` of its definition in `blockTypes`, inside the `div` `toHTML` writes for it. A definition of a type Quoin draws itself is ignored here. A `BlockCanvas` with `readOnly` stays the way to show a document the reader interacts with in the browser.

In a Server Component, `blockTypes` has to be a real array, so define it in a module with no `'use client'` banner: imported from a client module it arrives as a client reference, not as the definitions, and no preview is drawn. Build each definition there with the `defineBlock` of `quoin-editor/view` or `quoin-editor/diff`, the same function the main entry exports: the main entry is a client entry, so a server module cannot call its own.

```tsx
import { defineBlock } from 'quoin-editor/view';
import { ChartColumn } from 'lucide-react';

export const serverBlockTypes = [
  defineBlock<{ points: number[] }>({
    type: 'SALES_CHART',
    label: 'Sales chart',
    icon: ChartColumn,
    preview: ({ data }) => <output>{data.points.join(', ')}</output>,
  }),
];
```

Each component of these definitions can still be a client component, in a file of its own that starts with `'use client'`, as an `editor` with hooks has to be. A `preview` that is not marked as one runs on the server, so it uses no hook, effect or browser API.

`toHTML` titles a frame with its provider's name and names the checkbox of a task with no text `Task`. Pass `frameTitle` and `taskLabel` to name them in the reader's language, for example `frameTitle={(provider) => titles[provider] ?? provider}`. The canvas's English frame titles are `englishEmbedLabels.frameTitle` in `quoin-editor/embed`, a client entry, so a Server Component keeps a copy of its own.

## Comparing two versions

`quoin-editor/diff` draws the changes between two versions of a document, read-only, and like `quoin-editor/view` it uses no hook, effect or browser API, so it renders in a React Server Component and in plain Node.

```tsx
import type { QuoinBlock } from 'quoin-editor/engine';
import { QuoinDiff } from 'quoin-editor/diff';

export function Changes({ before, after }: { before: QuoinBlock[]; after: QuoinBlock[] }) {
  return <QuoinDiff before={before} after={after} className="article" />;
}
```

Blocks are drawn as `QuoinView` draws them, with `blockTypes`, `resolveAssetUrl`, `renderMath`, `highlight`, `embeds`, `embedProviders`, `frameTitle` and `taskLabel` working the same way (`taskLabel` defaults to the `emptyTask` label). A block only the newer version has is labelled "Added" with a green rule, one only the older version has "Removed" with a red rule, and a moved block "Moved" where it went and "Moved away" where it was. In a changed block, inserted words are underlined in an `ins` and deleted words struck through in a `del`, each opened and closed by visually hidden words ("inserted" ... "end inserted"), so no change is told by colour alone and two neighbouring changes read apart. A block that moved and was edited shows its word changes where it went. A change to anything but the text, such as a heading level, a checkbox or a picture's alt text, is labelled "Changed" with what changed when Quoin can name it. Rows and columns a table lost are drawn with their text deleted, as rows it gained are drawn inserted.

Nesting follows the newer version. List items and quote lines stay inside their list or quote, each marked on its own, and a numbered item keeps the number its version gives it. A removed list item or toggle holds only the blocks removed with it: a kept block nested after it is drawn where the newer version has it. A toggle that holds a change is drawn open, so no change hides in it. The table of contents lists a moved heading once, where it went, and a removed heading as deleted words. The rules and colours come from `quoin-editor/styles.css` and its tokens, in both themes, links included (a link inside a change takes the change's colour); the markup reads the same without it, each label set apart from the text it marks.

Words are found by the engine's `diffBlocks`, which splits text at spaces and punctuation, so a run of Chinese or Japanese text with no spaces counts as one word: a change to one character marks the whole run as deleted and inserted. Every string comes from `DiffLabels`, English by default, and the `labels` prop overrides any of them; `changed` takes the names of the attributes that changed and returns the label.

## Exporting to Word

`quoin-editor/docx` writes a document as a Word file with no dependency, in a browser, a worker or Node 18 and later. It needs no DOM, carries no `'use client'` banner and loads no React.

```ts
import type { QuoinBlock } from 'quoin-editor/engine';
import { toDocx } from 'quoin-editor/docx';

export async function downloadDocx(blocks: QuoinBlock[]): Promise<void> {
  const blob = await toDocx(blocks, { title: 'Release notes', resolveAssetUrl: (key) => `/files/${key}` });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'notes.docx' });
  link.click();
  URL.revokeObjectURL(link.href);
}
```

Headings take Word's Heading 1 to Heading 6 styles and the table of contents links to them. Bullet and numbered lists are Word lists, nested by their indent, each numbered list starting at its own first number; a task is a checkbox character and its text. Quotes take the Quote style, code a monospace style with its line breaks, and math its source in a monospace run. A callout is a shaded table of one cell, a divider a paragraph with a bottom border, and a toggle its summary followed by what it holds. Bold, italic, underline, strike, inline code, subscript, superscript, text colour, highlight and background become run properties; links to an absolute `http` or `https` address with a host (`https://example.com`, not `http:foo`), or to a `mailto` or `tel` address, become hyperlinks, and any other link is written as its text with its marks: an unsafe address (such as `javascript:`), a relative one (Word would resolve it against the file's folder) unless you pass `baseUrl`, a network path such as `\\host\share` or `//host/x` (Word would open it as a share), and a `mention:` link. Comments export as their plain text: the file holds no Word comments. Files, embeds and bookmarks become links under the same rule, so a file whose `resolveAssetUrl` address is relative, such as `/files/report.pdf`, is written as its name. Pass `baseUrl`, the absolute address of the page the document comes from (such as `location.href`), and a relative address is read against it, as the browser reads it on that page, and linked when it then is an `http` or `https` address with a host: `/files/report.pdf` with `baseUrl: 'https://app.example/doc/1'` links to `https://app.example/files/report.pdf`. An address that names its scheme, such as `http:foo`, is never read against it. Code keeps its tabs and its line breaks, whether written as LF, CRLF or CR. A block type Quoin does not know is written as its type in brackets and its plain text, when its spec gives one.

Pictures are fetched from the address `resolveAssetUrl` gives (or their own `url`) through `fetchAsset`, the global `fetch` by default, four at a time (`imageConcurrency`), and drawn at the size their PNG, JPEG, GIF or WebP header gives, shrunk to the page width or set to their width percent. One that fails, answers with an error status, is no such picture or takes longer than `imageTimeout` milliseconds (10,000 by default; `Infinity`, a negative number, NaN or more than 2,147,483,647 waits that longest time, about 24.8 days) is replaced by its alt text, and the export goes on. WebP pictures are written as WebP, which Word 2019 and Microsoft 365 show and older Word versions replace with a placeholder. Parts are deflated through `CompressionStream` where the runtime offers it and stored otherwise; either way the archive is a standard zip.
