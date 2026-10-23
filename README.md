# Quoin

**Blocks on screen. Markdown on disk.**

Quoin is a block editor for React that keeps every text block as readable markdown inside a typed array you hold in your own state; images, files, code, dividers, tables and the catalogue blocks are typed data beside them. Writers get live formatting, a slash menu and drag handles; you get a document you can save, diff in git or hand to an LLM without a conversion step.

[![npm](https://img.shields.io/npm/v/quoin-editor)](https://www.npmjs.com/package/quoin-editor) [![CI](https://github.com/AmineSeboui/quoin-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/AmineSeboui/quoin-editor/actions/workflows/ci.yml) [![licence](https://img.shields.io/npm/l/quoin-editor)](LICENSE)

[Live demo](https://amineseboui.github.io/quoin-editor/) | [Docs](https://amineseboui.github.io/quoin-editor/docs/getting-started/) | [Changelog](CHANGELOG.md)

![Typing markdown that formats as it is typed, opening the slash menu and dragging a callout into place](demo/public/quoin-demo.gif)

- **Live formatting, markdown on disk.** Type `**bold**` or `# ` and see bold text or a heading; the block stores the markdown. Blocks you never edit are never rewritten (`src/engine/blocks/codec.test.ts`).
- **Typed blocks you control like an input.** A document is `QuoinBlock[]`, plain JSON, passed as `blocks` and returned through `onChange`, so saving, versioning and validation stay in your code.
- **Notion-style UI included, MIT.** Slash menu, bubble toolbar, block menu, drag handles, a mobile toolbar and a shortcuts dialog, with no account and no paid tier.
- **Custom blocks as plain React.** `defineBlock` takes an editor, a preview, or both, as React components; no schema language to learn.
- **Accessible, with tested keyboard and screen reader support.** In CI, axe runs over the canvas and its menus in light and dark mode (`e2e/tests/canvas/a11y.spec.ts`), a document is written with the keyboard alone (`keyboard-only.spec.ts`), and moves and deletions are announced (`shortcuts.spec.ts`). [What is not checked yet](https://amineseboui.github.io/quoin-editor/docs/accessibility/#what-is-not-checked-yet).

## Install

```bash
npm install quoin-editor
```

React 18.2 or 19, TypeScript 5.4 or later. Tailwind is optional, v3 and v4 both work. The npm tarball is about 2.0 MB, ESM and CommonJS with their sourcemaps; a page loads only the entries it imports.

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

What `onChange` hands you, and what you store:

```json
[
  { "id": "a1", "type": "MARKDOWN", "data": { "markdown": "# Release notes" } },
  { "id": "b2", "type": "MARKDOWN", "data": { "markdown": "- Faster **paste**" } },
  { "id": "c3", "type": "CALLOUT", "data": { "tone": "tip", "body": "Back up first." } }
]
```

## What ships

| Entry | What it adds |
| --- | --- |
| `quoin-editor` | The canvas: text, lists, tasks, quotes, callouts, toggles, dividers, code, images and files, with every menu and toolbar |
| `quoin-editor/table`, `/embed`, `/math`, `/toc`, `/mention`, `/emoji`, `/find`, `/stats` | Opt-in features, each its own entry; `quoin-editor/catalogue` adds them all |
| `quoin-editor/yjs`, `/presence` | Real-time co-editing through your own Yjs provider, and collaborators' carets |
| `quoin-editor/comments` | Comment threads anchored to text, kept in your store |
| `quoin-editor/ai` | Your model's answers streamed into the document; Quoin never calls a model |
| `quoin-editor/view`, `/diff`, `/docx` | Server rendering with no hooks, a diff of two versions, a Word export |
| `quoin-editor/headless`, `/engine` | The editor without the canvas UI, and the engine alone with no React |

## Why Quoin

Each cell links to the page that shows it; the Tiptap UI cell also draws on the review in [#73](https://github.com/AmineSeboui/quoin-editor/issues/73) (2026-10-12).

| | Quoin 1.0 | Tiptap 3 | BlockNote | Editor.js |
| --- | --- | --- | --- | --- |
| Stored document | Block array, markdown per text block | [JSON, or HTML][tt-store] | [Block JSON][bn-formats] | [JSON][ej-repo] |
| Markdown | The storage format | [`@tiptap/markdown`, an early release][tt-md] | [Export and import, documented as lossy][bn-formats] | [Community plugin][ej-awesome] |
| Notion-style UI | Included, MIT | [MIT menus and drag handle][tt-review]; [Notion-like template on a paid plan][tt-notion] | [Included][bn-home] | [Toolbox and inline toolbar][ej-home] |
| Licence | MIT | [MIT core, paid Pro extensions][tt-repo] | [MPL-2.0, `xl-*` packages GPL-3.0 or commercial][bn-repo] | [Apache-2.0][ej-repo] |
| Real-time collaboration | Yjs, opt-in entry | [Yjs][tt-collab] | [Yjs][bn-collab] | [On its roadmap][ej-repo] |
| Comments | Opt-in, your store | [Paid plan][tt-comments] | [Built in, on Yjs or a thread store][bn-comments] | [Community plugin][ej-awesome] |
| Framework | React | [React, Vue, Svelte, plain JavaScript and more][tt-install] | [React][bn-start] | [Plain JavaScript][ej-start] |

Sources, checked on 2026-10-23: Tiptap [persistence][tt-store], [markdown][tt-md], [Notion-like template][tt-notion], [repository][tt-repo], [collaboration][tt-collab], [comments][tt-comments], [install][tt-install]; BlockNote [home][bn-home], [formats][bn-formats], [repository][bn-repo], [collaboration][bn-collab], [comments][bn-comments], [getting started][bn-start]; Editor.js [home][ej-home], [repository][ej-repo], [getting started][ej-start], [awesome-editorjs][ej-awesome]. Quoin: storage in `src/engine/blocks/markdown-spec.ts`, untouched blocks in `src/engine/blocks/codec.test.ts`, collaboration in `e2e/tests/canvas/presence.spec.ts`, comments in `e2e/tests/canvas/comments.spec.ts`.

[tt-store]: https://tiptap.dev/docs/editor/core-concepts/persistence
[tt-md]: https://tiptap.dev/docs/editor/markdown
[tt-review]: https://github.com/AmineSeboui/quoin-editor/issues/73
[tt-notion]: https://tiptap.dev/docs/ui-components/templates/notion-like-editor
[tt-repo]: https://github.com/ueberdosis/tiptap
[tt-collab]: https://tiptap.dev/docs/editor/extensions/functionality/collaboration
[tt-comments]: https://tiptap.dev/docs/comments/getting-started/overview
[tt-install]: https://tiptap.dev/docs/editor/getting-started/install
[bn-home]: https://www.blocknotejs.org/
[bn-formats]: https://www.blocknotejs.org/docs/foundations/supported-formats
[bn-repo]: https://github.com/TypeCellOS/BlockNote
[bn-collab]: https://www.blocknotejs.org/docs/features/collaboration
[bn-comments]: https://www.blocknotejs.org/docs/features/collaboration/comments
[bn-start]: https://www.blocknotejs.org/docs/getting-started
[ej-home]: https://editorjs.io/
[ej-repo]: https://github.com/codex-team/editor.js
[ej-start]: https://editorjs.io/getting-started
[ej-awesome]: https://github.com/editor-js/awesome-editorjs

## Learn more

- [The controlled contract](https://amineseboui.github.io/quoin-editor/docs/contract/): loading, autosave, discarding, undoing a deletion
- [Theming](https://amineseboui.github.io/quoin-editor/docs/theming/): `--quoin-` tokens, dark mode, cascade layers, Tailwind
- [Custom blocks](https://amineseboui.github.io/quoin-editor/docs/custom-blocks/) and [uploads](https://amineseboui.github.io/quoin-editor/docs/uploads/)
- [Extensions](https://amineseboui.github.io/quoin-editor/docs/extensions/): every opt-in feature, and writing your own
- [Collaboration](https://amineseboui.github.io/quoin-editor/docs/collaboration/), [comments](https://amineseboui.github.io/quoin-editor/docs/comments/) and [AI](https://amineseboui.github.io/quoin-editor/docs/ai/)
- [Server rendering](https://amineseboui.github.io/quoin-editor/docs/server-rendering/): read-only, `QuoinView`, `QuoinDiff`, `toDocx`
- [Accessibility](https://amineseboui.github.io/quoin-editor/docs/accessibility/): what each test suite checks, and what it does not yet
- [FAQ](https://amineseboui.github.io/quoin-editor/docs/faq/): the package name, stability, React versions, and [upgrading from 0.4](MIGRATION.md)

## The name

A quoin is the wedge a letterpress printer tightens to lock blocks of type into the frame, so nothing moves while the page is printed. Quoin does the same for blocks of markdown.

## Licence

MIT. Copyright (c) 2026 Amine Sboui. See [LICENSE](LICENSE).
