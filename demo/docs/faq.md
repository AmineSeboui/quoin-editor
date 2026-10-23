---
title: FAQ
description: Why the package is called quoin-editor, what the name means, which frameworks it supports and what the 1.0 version promises.
---

# FAQ

## Why is the package called `quoin-editor`?

npm rejects the bare name `quoin` as too similar to an existing package, so Quoin is published as `quoin-editor`. Everywhere in these pages, `quoin-editor` is the package you install and import.

## Where does the name come from?

A quoin is the wedge a letterpress printer tightens to lock blocks of type into the frame, so that nothing moves while the page is printed. Quoin keeps blocks of markdown in place the same way.

## Does it render markdown?

Yes. The canvas draws each text block formatted as you type, and keeps its markdown source in `data.markdown`. `toMarkdown`, `toHTML` and `toPlainText` from `quoin-editor/engine` turn a whole document into each format, `fromMarkdown` reads one back, and [`QuoinView`](https://amineseboui.github.io/quoin-editor/docs/server-rendering/) draws it on a server. Blocks you never edit are never rewritten: `onChange` hands them back as the same objects you supplied, with the same markdown (`src/engine/blocks/codec.test.ts`). A block whose id repeats another's is the exception: it gets a fresh id.

## Which frameworks does it support?

React 18.2 and later, React 19 included. `npm run check:consumer` typechecks the packed package against both majors and renders the server entries in plain Node on each.

## How stable is it?

From 1.0, Quoin follows semantic versioning: a breaking change waits for the next major version, and every change is listed in the [changelog](https://github.com/AmineSeboui/quoin-editor/blob/main/CHANGELOG.md). Until 1.0, a minor version could break, so pin `~0.4.0` to stay on 0.4.
