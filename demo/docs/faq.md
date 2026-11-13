---
title: FAQ
description: Why the package is called quoin-editor, what the name means, what a paste from a word processor keeps, which frameworks it supports and what its semantic versioning promises.
---

# FAQ

## Why is the package called `quoin-editor`?

npm rejects the bare name `quoin` as too similar to an existing package, so Quoin is published as `quoin-editor`. Everywhere in these pages, `quoin-editor` is the package you install and import.

## Where does the name come from?

A quoin is the wedge a letterpress printer tightens to lock blocks of type into the frame, so that nothing moves while the page is printed. Quoin keeps blocks of markdown in place the same way.

## Does it render markdown?

Yes. The canvas draws each text block formatted as you type, and keeps its markdown source in `data.markdown`. `toMarkdown`, `toHTML` and `toPlainText` from `quoin-editor/engine` turn a whole document into each format, `fromMarkdown` reads one back, and [`QuoinView`](https://amineseboui.github.io/quoin-editor/docs/server-rendering/) draws it on a server. Blocks you never edit are never rewritten: `onChange` hands them back as the same objects you supplied, with the same markdown. A block whose id repeats another's is the exception: it gets a fresh id.

## What does a paste from Word or Google Docs keep?

Its structure. The canvas reads the HTML that Microsoft Word on the desktop and on the web, Google Docs, LibreOffice Writer, Notion, TextEdit and Pages put on the clipboard, and turns it into blocks:

- **Headings**, from heading elements, from the heading role Word on the web gives a paragraph, and from a paragraph set larger than most of the text pasted with it, which is how TextEdit, Pages and a hand-styled Word heading write one. At 1.8 times that size a paragraph is a level 1 heading, at 1.4 times a level 2 and at 1.15 times a level 3.
- **Lists**, nested to their level, among them the lists Word writes as paragraphs with a typed marker and an indent level. **Tasks** come from the checklists of Google Docs and Notion, and from a line that opens with a ballot box (☐, ☑ or ☒), as a Word checkbox or a Pages document writes it.
- **Tables.** A table here has no merged cells, so a merged cell keeps its text in its first row and column and leaves the cells it covered empty. Every other cell stays in its own column, and nothing is lost but the merge.
- **Bold, italic, underline, strikethrough, inline code, links, text colour and highlight.** Text in a monospaced typeface becomes inline code. A colour becomes the nearest colour of the palette, and one far from every palette colour, or the black text and white page of the source, is left out.
- **Pictures with a web address.** With an [`upload` function](https://amineseboui.github.io/quoin-editor/docs/uploads/), the canvas reads each picture and uploads it as it would a dropped file, so the document keeps a copy of its own rather than a link the source may later expire. A picture whose server does not let the page read it stays linked to its address.

The document stores markdown, so the typeface, the font size, line and paragraph spacing, alignment, and indentation outside a list have nowhere to live, and a paste does not try to look the way the page looked in the word processor. Leaving them out is deliberate. A picture that a word processor keeps as a file on the writer's computer, as desktop Word does, or carries inside the clipboard itself, as LibreOffice can, is left out too, since the page cannot read it as an address: paste or drop the picture on its own to upload it.

## Which frameworks does it support?

React 18.2 and later, React 19 included. `npm run check:consumer` typechecks the packed package against both majors and renders the server entries in plain Node on each.

## How stable is it?

From 1.0, Quoin follows semantic versioning: a breaking change waits for the next major version, and every change is listed in the [changelog](https://github.com/AmineSeboui/quoin-editor/blob/main/CHANGELOG.md). Until 1.0, a minor version could break, so pin `~0.4.0` to stay on 0.4.

## How do I upgrade from 1.x to 2.0?

Change the version. 2.0 keeps the document format, the props of every component and every command of 1.x, and removes seven names that only the view layer ever called itself: `BlockShell`, `SelectionSink`, the `BlockShellProps` and `SelectionSinkProps` that typed them, `VoidBlockFallback`, `defaultRenderers` and `isCrossSelection`. Five of the seven carried a deprecation notice from 1.8.0. A host that imports none of them has nothing else to do, and the [migration guide](https://github.com/AmineSeboui/quoin-editor/blob/main/MIGRATION.md#migrating-from-1x-to-20) covers the one with a cost, `defaultRenderers`, whose text a renderer of your own draws with `EditableRegion`.

## How do I upgrade from 0.4?

A 0.4 document loads in 1.0 as it is, and the `BlockCanvas` props keep their names. The [migration guide](https://github.com/AmineSeboui/quoin-editor/blob/main/MIGRATION.md) lists what changes, from multi-paragraph blocks that split on their first edit to the 0.4 helpers that became engine commands, and ends with a checklist.
