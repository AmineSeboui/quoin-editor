# Changelog

Every release of `quoin-editor` is listed here, newest first, in the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). From 1.0.0 the package follows [semantic versioning](https://semver.org/): a breaking change waits for the next major version. Until then, Quoin was 0.x and a minor version could contain breaking changes; those known at release were marked "Breaking". The 0.x sections are kept as they were released, "Docs" headings included. Moving from 0.4 to 1.0 is covered step by step in [MIGRATION.md](MIGRATION.md). Review finding ids such as F-17 are those of the 0.4.0 review in [#73](https://github.com/AmineSeboui/quoin-editor/issues/73).

## Unreleased

### Added
- A custom block's editor receives `blockId`, `index` (the block's index in the flat `blocks` array, counting from 0 with nested blocks included, kept current as blocks move; only a block whose index changed draws again) and `onRemove`, which removes the block as one undo step and puts the caret where deleting the selected block puts it. A preview receives `onChange` on an editable canvas, written like an editor's with one undo step per block, so it can hold a control such as a checkbox; a read-only canvas and `QuoinView` pass none. The canvas always passes all of these, and always passes a preview its `blockId`. They are optional in `BlockEditorProps` and `BlockPreviewProps`, so an editor rendered directly with only `data` and `onChange` still compiles.
- A block definition takes an optional `parse`, which reads a block's stored `data` into the shape its `editor` and `preview` take, to fill required fields and migrate older shapes. The canvas, `QuoinView` and `QuoinDiff` hand its result to `editor` and `preview`; it runs when the block is drawn, once per stored data, and writes nothing, so the stored data changes only when the editor or preview calls `onChange`. A block inserted without `initialData` is seeded with `parse({})`, so `parse` should accept `{}`; when seeding throws, nothing is inserted and the error goes to the canvas's `onError`, or to a warning in development without one. When `parse` throws while drawing, the canvas draws the block's error fallback and reports the error to `onError`, and `QuoinView` and `QuoinDiff` draw the block without its preview and warn once per block type in development. `initialData` stays optional; the custom blocks page recommends `parse` for data with required fields and shows a versioned migration.
- An image can be marked as deliberately decorative: its data takes `decorative: true` (stored only when true, kept by lossless markdown and `quoin-editor/yjs` like `alt`), and the alt text popover has a "Decorative image" checkbox that stores it and clears the alt text; typing alt text unchecks it. An editable canvas draws a "No alt text" badge, which opens the popover, on an image with an empty alt text that is not decorative; a read-only canvas, `QuoinView` and `toHTML` draw none. Output is unchanged: both cases are written with `alt=""`. New labels `decorativeImage` and `noAltBadge`.

### Changed
- The default `--quoin-warning` and `--quoin-input` reach 3:1 where they did not. Light `--quoin-warning` goes from `oklch(0.65 0.16 65)` to `oklch(0.6 0.16 65)`, the rule of a warning callout against its wash from 2.84:1 to 3.40:1 (dark stays at 7.82:1). `--quoin-input`, the border of the outline button, goes from `oklch(0.922 0 0)` (1.26:1 on the page) to `oklch(0.62 0 0)` (3.64:1) in light, and from `oklch(1 0 0 / 15%)` to the opaque `oklch(0.56 0 0)` (4.25:1 on the page, 3.85:1 on a popover) in dark. A host that sets these tokens keeps its own values.
- The coverage gate in CI now also covers the canvas and the hooks, with line thresholds of 95 percent on `src/view`, 97 on `src/blocks`, 98 on `src/ui` and 98 on `src/hooks`, 98 on `src/context.tsx` and 98 on `src/i18n`, next to the engine's 90.
- The build runs each output chunk through Rollup's tree shaking after esbuild, which merges a chunk's imports and drops arguments no caller passes: the main entry goes from 155,039 to 152,741 B gzip and `quoin-editor/headless` from 70,129 to 69,824 B, and the main entry with any feature entry is about 2.2 KB smaller. The `'use client'` directive is on the same files as before, and the engine, view, diff, docx and yjs entries still carry none. The sourcemaps leave out a segment that maps to the same place as the one before it on its line, which changes no lookup and keeps the tarball about 1 MB packed.

### Fixed
- The attributes an extension's block decoration puts on its block's element are filtered to the names that start with `data-` or `aria-`: a decoration with `style`, `className`, an event handler or `dangerouslySetInnerHTML` no longer reaches the element, and can no longer make React throw.
- A renderer that throws while drawing its block no longer unmounts the whole canvas: that block draws a fallback named by the new `blockError` label (`Block could not be drawn`) in its own element, the other blocks keep working, the error goes to `onError` when one is given, and React reports it as it does any caught error, and the block is drawn again when its data changes. `EditorView` takes `blockErrorLabel` and `onBlockError` for the same.
- ArrowUp and ArrowDown pass over a text block whose renderer threw, rather than putting the caret in a block that has no text to hold it.

## 1.0.2 (2026-10-27)

### Fixed
- A task's checkbox and an embed's frame are never left with an empty or blank name. In the canvas, a `task` label that is empty or only white space names the checkbox `Task`, and a `frameTitle` label that returns one titles the frame with its provider's name, or with its page's address when the provider has no name. `toHTML`, `QuoinView` and `QuoinDiff` treat a `taskLabel`, an `emptyTask` label, a `frameTitle` or a provider name of only white space as empty too, rather than writing it as the name.
- With `quoin-editor/yjs`, a collaborator's change to a block's type reads only that block again from the shared document, rather than the whole document, as does a collaborator's change to the rows or columns of a table, or any other change that only puts in or takes out the start of a region: at 20,000 blocks a type change takes about 8 ms, against about 75 ms before, close to the 5 ms of a collaborator's typing. A block that concurrent edits left out of shape still reads the whole document, as before.
- With `quoin-editor/yjs`, the caret stays on its character when a collaborator's change reads blocks of the shared document again, such as turning the paragraph above it into a code block: it was put back by the layout from before the change and could jump within its block or into another one.
- With `quoin-editor/yjs`, a change another writer makes to the `id` in a block's marker in the shared `Y.Text` is read: the editor takes the document as the text now reads, where it kept showing the block under its old id.
- With `quoin-editor/yjs`, content in the shared `Y.Text` that the `Y.Text` API never writes, such as values put in through `Y.Array` on the same name, counts as one skipped embed per value, rather than being dropped, so the positions the editor holds match those of Yjs.

### Known limits
- In the canvas, a task's text box still takes a `task` label that is empty or only white space as its name.

## 1.0.1 (2026-10-26)

### Added
- `toDocx` takes an optional `baseUrl`, the address of the page the document comes from: a link or a file whose address is a relative path, such as `/files/a.pdf` or `notes/a.pdf`, is linked to that address read against it, rather than written as its text. A network path (`//host/x`, `\\host\share`, `/\host`) and a fragment such as `#top` stay text. A base that is not an absolute `http` or `https` address is ignored, a user and password in it are left out of the links, and an empty link stays text.
- `commentsExtension` takes an optional `initialLayout: 'wide' | 'narrow'`, the layout drawn on the server and in the first render before the canvas is measured, so a server-rendered wide canvas no longer shifts by 236 px as it hydrates. The default stays `'narrow'`.

### Changed
- `Transaction` and `ViewController` keep their private state in native private fields, so a proxy around one of them, such as Vue's `reactive` or Valtio's `proxy`, cannot read it and its methods throw: wrap the object that holds them, not these instances.
- The transaction that moves the caret to where text is dropped has the `drop` origin, rather than `command`.
- Docs: chains merge the meta of every part, so a key one part set is seen on the whole chain (extensions page).
- Docs: two clients can hold a table's alignment as no `align` or as `align: [null, null]`, which the editor and `QuoinDiff` treat as equal; a host comparing saved JSON should normalise `align` (collaboration page).
- Docs: typing into a block whose region another edit took out can bring along text waiting before it, which then shows one block higher on every client (collaboration page).
- Docs: edits a headless editor makes while unmounted stay local and are not sent when it connects again (collaboration page).
- Docs: the `onError` of `yjsCollaboration` is the adapter's own, apart from the canvas's; pass both the same handler (collaboration page).

### Fixed
- Under a collaboration, `editor.chain().undo().run()` and `editor.chain().redo().run()` undo and redo when the chain holds nothing else, rather than doing nothing. A chain that holds other commands as well still does nothing.
- A canvas rendered on the server, as with `react-dom/server`, leaves out a code token's `color` that holds what could leave the declaration or load a resource (any of `;` `{` `}` `\` `"` `'` `<` `>` `!`, a `/*`, or `url(`, `image(`, `image-set(` or `expression(`), rather than writing a value such as `red;background-image:url(...)` into the page as it is, and the canvas in the browser leaves out the same values. Other colours, such as `var(--name, #fff)`, `hsl(var(--primary))`, `color-mix()` and `light-dark()`, are drawn by the canvas as in 1.0, and now by `QuoinView` too, which uses the same rule.
- `toHTML`, `QuoinView` and `QuoinDiff` no longer write an empty accessible name: an empty `taskLabel` names a task with no text `Task` (in `QuoinDiff`, the `emptyTask` label, and `Task` when that is empty too), and a frame whose `frameTitle` is empty is titled with its provider's name, or with its page's address when the provider has no name.
- `toDocx` writes a link to an `http` or `https` address with no host, such as `http:foo` or `http://?x`, as its text, as it does other targets Word cannot open, rather than as a hyperlink.
- With presence, a long collaborator name at the end of a line is cut off where the avatars' gutter begins, rather than over the avatars.
- With presence, a collaborator's caret near the side of a wide table, and its name, are cut off at the table's side as the table's text is, rather than drawn whole past it.
- With presence, a collaborator's caret, and with `quoin-editor/ai` an answer, in a scroller that sits inside another box that clips what overflows, such as a table in a custom block, is clipped by both, rather than only by the nearest one.
- With presence, a collaborator's caret in a wide table moves with the table as it scrolls, rather than a frame behind it.
- With `quoin-editor/ai`, the room kept under a block for its answer no longer adds to the block's bottom padding or to the row gap of a flex or grid canvas under a block another block follows: the answer takes that space first, and the room makes up only the rest. Padding the block paints, with a bottom border or a background, is left to the block.
- With `quoin-editor/ai`, an answer growing above the part of the page being read no longer pushes that text down in a browser without scroll anchoring, such as Safari, or on a page that turns scroll anchoring off, smooth `scroll-behavior` or not, and in a canvas that scrolls itself.
- With `quoin-editor/comments`, a thread just resolved or deleted no longer comes back for a moment when your store sets new copies of threads that have not changed before it records the resolution. It comes back once your store, having resolved or removed it, reopens it.
- With `quoin-editor/comments`, a selection your code sets, as a command or an AI answer does, no longer closes a thread a click opened, "Text removed" included: only the writer's own caret moves close it, an undo, a redo and a drop included.
- With `quoin-editor/comments`, a thread a click opened closes once the writer moves the caret out of its text, rather than staying open over the lines they go on to type.
- A canvas drawn inside another canvas's tree owns its own text, menus and popovers: focus in them no longer counts as focus in the outer canvas, which kept the inner canvas's presence, comments and AI from seeing it as their own and let the outer canvas's go on as if focused.
- With `quoin-editor/yjs`, a row two people add to a table at the same moment, followed by a move of the table and a new column, no longer has one client write cell text at the wrong place, which split it across cells for the others.
- With `quoin-editor/yjs`, deleting a table while someone adds or removes one of its rows or columns no longer leaves hidden regions in the line after it, over which Enter threw: the cell text shows at the end of that line.
- Presence on a second editor given a `yjsCollaboration` that already serves one, which stays unconnected, no longer writes to the awareness: unmounting it no longer takes the person and their selection out while the first canvas is still mounted.
- An editor that disconnects from a `yjsCollaboration` and connects again within a frame, as StrictMode or a quick remount does, keeps what it can undo and redo. A collaboration left disconnected longer lets its undo history go, as in 1.0.
- `yjsCollaboration` reports to its `onError` a change from the shared document that does not apply to the editor, as the error applying it raised, before the editor takes the document as the shared text reads, rather than recovering in silence.
- A block that a collaborator's change leaves selected as a whole comes into view with the writer's next change, rather than only once the selection leaves it and comes back.
- A collaborator's caret move drawn in the same render as a change from your code, such as a command that selects a block below the fold, no longer keeps that change from scrolling it into view. A collaborator's change to the document still scrolls nothing.
- A table's row or column menu stays open while a collaborator types in its own row or column. It still closes when a change from elsewhere moves that row or column.
- Two people changing one block's type at the same moment no longer hide the block's text: text left in a region the winning type does not have shows in that type's own region.
- A caret in a block that a new `blocks` array changes on both sides of it stays on its character, rather than moving by the length of the later change.

### Known limits
- A task's checkbox and an embed's frame in the canvas still get no name when a host's `task` or `frameTitle` label is empty or blank, and a `taskLabel` or `frameTitle` of spaces only gives `toHTML`, `QuoinView` and `QuoinDiff` a blank name.
- With presence, a collaborator's caret can stay off its character after a style change that reflows the text without resizing its block, until the next change, scroll or resize.
- With `quoin-editor/yjs`, a table cell whose region concurrent row and column edits took out cannot be selected or typed into until the table is rewritten, as by adding or removing a row or a column. This is as in 1.0.0.

## 1.0.0 (2026-10-23)

Quoin 1.0 replaces the 0.4 canvas, a card per block with a textarea opened to edit it, by an editor of its own: an engine with no dependency, a view that types into the page in place, and a canvas UI on top. A 0.4 document loads as it is, and the 0.4 `BlockCanvas` props keep their names. [MIGRATION.md](MIGRATION.md) lists what a 0.4 host changes.

### Added
- `quoin-editor/engine`: the editing engine alone, with no React, no DOM and no `'use client'` banner. A document model of blocks with inline regions, steps, transactions and history, commands (`editor.commands`, `editor.chain()`), input and paste rules, and a markdown codec that reads a 0.4 document as it is and writes back only the blocks that were edited. Also `toMarkdown`, `fromMarkdown`, `toHTML`, `toPlainText`, `fromHTML`, `diffBlocks` and `countDoc`.
- `quoin-editor/headless`: the engine and its editable view, with no canvas UI: `useQuoinEditor`, `EditorView`, `EditableRegion` and `ViewController`. Each text region is typed into in place, with IME composition, native caret movement, selections across blocks and the clipboard handled by the view.
- `quoin-editor`: `BlockCanvas` rebuilt on the engine. Paragraphs, headings, bullet, numbered and task lists, quotes, callouts, toggles and dividers are typed in place, with live formatting from markdown shortcuts (`**bold**`, `# `, `- `, `> ` and the rest). Code, image and file blocks are drawn and edited inside the canvas. The canvas adds a slash menu, a bubble toolbar for formatting and links, a link popover, a gutter with a drag handle and a "+" that adds a block below, a block menu (Turn into, Color, Duplicate, Copy, Copy link to block, Move up, Move down, Delete) reached from the handle, a right click on the gutter or Mod+/, drag and drop with a drop line, text and background colours, text alignment, a toolbar for touch screens and a keyboard shortcuts dialog (Mod+Shift+/).
- `BlockCanvas` props `extensions`, `highlight`, `autoFocus` (off by default), `placeholder`, `labels` and `blockLink`, and a ref whose `QuoinEditorHandle` gives the `editor`, the `controller`, `focus()` and `toMarkdown()`.
- `defineExtension` for extensions of your own: blocks, marks, atoms, commands, keymaps, input and paste rules, plugins, decorations, transaction hooks, and a `ui` field (`ExtensionUI`) that adds slash items, bubble items, block menu items, block renderers and overlays to the canvas.
- `QuoinLabels`, `englishLabels`, `resolveLabels` and `useLabels`: every string the canvas shows or speaks, English by default and replaced key by key through `labels`.
- `CodeHighlighter` and `CodeToken`, for the `highlight` prop that colours code blocks.
- The optional `indent` field of `QuoinBlock`, the nesting depth of list items and of the blocks inside a toggle.
- The engine reads and writes the `DIVIDER`, `TOGGLE`, `TABLE`, `EMBED`, `BOOKMARK`, `MATH` and `TOC` block types, beside the five 0.4 types.
- Opt-in features, each an entry of its own that a page loads only when it imports it:
  - `quoin-editor/table`: tables typed cell by cell, with row and column menus, column widths and cell ranges.
  - `quoin-editor/embed`: embeds framed from YouTube, Vimeo, Loom, Figma, CodePen, Spotify and SoundCloud, and bookmark cards, with an `unfurl` option of your own.
  - `quoin-editor/math`: math blocks and formulas in a line, drawn by your `renderMath`, such as KaTeX.
  - `quoin-editor/toc`: a table of contents block that follows the headings.
  - `quoin-editor/mention`: `@` mentions, found by your own `search`.
  - `quoin-editor/emoji`: a `:` menu and an emoji picker, whose data loads the first time one opens.
  - `quoin-editor/find`: find and replace.
  - `quoin-editor/stats`: word and character counts, a limit, focus mode and typography rules.
  - `quoin-editor/catalogue`: `catalogue()`, every feature above at once.
- Platform entries:
  - `quoin-editor/yjs`: real-time co-editing through a Yjs document and your own provider, with an undo of your own changes only. `yjs` is an optional peer dependency.
  - `quoin-editor/presence`: collaborators' selections, carets and avatars.
  - `quoin-editor/comments`: comment threads anchored to text, kept in your store.
  - `quoin-editor/ai`: answers of your model streamed into the document; Quoin never calls a model itself.
  - `quoin-editor/view`: `QuoinView`, read-only output with no hooks, for a server component.
  - `quoin-editor/diff`: `QuoinDiff`, the changes between two versions of a document, block by block and word by word.
  - `quoin-editor/docx`: `toDocx`, a Word document written in a browser, a worker or Node.

### Changed
- Text blocks are typed in place instead of in a textarea that a click opens. Undo and redo work across the whole document, and the caret moves from block to block with the arrows.
- A new text block holds one line: a paragraph, a heading, a list item, a task or a quote. A 0.4 `MARKDOWN` block holding several paragraphs is kept as it is until it is first edited; it is then split into one block per line, the first keeping its id and the others taking ids derived from it (`<id>-2`, `<id>-3` and on), each written back as the canonical markdown of its line. A table in it becomes a `TABLE` block and an image alone on its line an `IMAGE` block.
- Nested list items keep their depth in `indent` rather than in leading spaces of their markdown.
- An image's `caption` and a callout's `body` are inline markdown, typed in place like a paragraph.
- The core blocks write new optional keys into `data` once a writer uses what they hold: `align`, `color` and `background` on `MARKDOWN`, `icon` on `CALLOUT`, `url`, `align` and `widthPercent` on `IMAGE`, and `mime` on `FILE`, beside `indent` on the block itself. Every 0.4 key keeps its name and meaning.
- `QuoinConfig`, which `useQuoin()` returns, gains `highlight` and the required `controller` and `labels`. `QuoinProvider` fills them in, so only a `QuoinConfig` built by hand, such as a test double, needs them.
- A structural copy of the document coming back is recognised as an echo within the last 256 changes the canvas reported, instead of 64.
- `onDelete` also reports whole blocks removed by typing over a selected block or pasting over selected blocks. A line that Backspace or Delete merges into its neighbour is still not reported.
- `defineBlock` takes any icon component that accepts a class name and `aria-hidden`, not only a lucide one. A custom block shows its `preview` at rest; its `editor` opens on a double click, its Edit button or Enter on the selected block, and Escape closes it. A definition for `DIVIDER` draws everywhere, and one for `MARKDOWN`, `CALLOUT` or `TOGGLE` only on a read-only canvas, which warns in development when the canvas is editable.
- `quoin-editor/headless` exports the view and the engine, and `formatShortcut` is exported from the main entry only. The main entry re-exports everything in `quoin-editor/headless`.
- A canvas given a collaboration extension is uncontrolled while the shared document is connected: it ignores any `blocks` array it did not emit, and warns in development.
- The stylesheet declares `color-scheme` in light and dark, and reads new tokens: `--quoin-selection`, the text and background colours `--quoin-color-*` and `--quoin-bg-*`, `--quoin-comment`, `--quoin-comment-active` and `--quoin-comment-edge`, `--quoin-diff-inserted` and `--quoin-diff-deleted`, and `--quoin-link`. Every 0.4 token keeps its name.
- English callout tone names are written in lower case in the tone chip and its menu.
- One build with code splitting serves every entry, in ESM and CommonJS, and each entry is held to a gzip budget in CI.
- The tarball is about 1 MB packed, under 5 MB unpacked: the sourcemaps leave out `sourcesContent` and name their sources relative to the map. They still map each line to its file and line under `src/`. Every entry is exported, and the package publishes `dist`, the README, the license, this changelog and MIGRATION.md.
- `@radix-ui/react-context-menu` is a new dependency, for the block menu on a right click.

### Removed
- The 0.4 textarea helpers, from both `quoin-editor` and `quoin-editor/headless`: `applyEdit` and `Edit`, `lineAt`, `toggleLinePrefix` and `LinePrefix`, `continueList`, `indentList`, `wrapSelection`, `linkPaste` and `WrapKind`, `insertCommand` and `InsertableCommand`, `shouldOpenPalette`, `caretRect` and `CaretRect`, and `useMarkdownKeymap`. Engine commands do their work; MIGRATION.md maps each one.
- `TEXT_COMMANDS` and `TextCommand`: the slash menu's items come from the canvas and from extensions.
- `useBlockList`, with `BlockList` and `UndoToken`: the editor's own commands and history cover it.
- `useAutoGrow`: nothing is drawn in a textarea any more.
- `formatShortcut` from `quoin-editor/headless` (it stays in `quoin-editor`).
- The dependencies `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable` and `@dnd-kit/utilities` (the canvas drags blocks itself), `cmdk` (the slash menu is the canvas's own), `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-label` and `@radix-ui/react-select`.

### Fixed
0.4.1 fixed F-01, F-03, F-04, F-05, F-06, F-07, F-08, F-10, F-16, F-18, F-19, F-24, F-25, F-27, F-39 and F-40, listed under 0.4.1 below. 1.0 closes these; findings it only partly addresses are under Known gaps:
- F-02 [ARCH-1, CQ-12]: the card and textarea model is gone. Text is typed in place on one engine, with one history for the whole document and the caret moving across blocks.
- F-09 [CQ-4, PERF-1]: a keystroke re-renders the one block it changes, since each block shell is memoised on its block (`src/view/react/BlockShell.tsx`). `e2e/tests/headless/performance.spec.ts` holds typing in a 1,000 block document to a p95 of 16 ms on a development machine, and to a ratio against a small document in CI.
- F-13 [PKG-4]: the README no longer calls the headless entry safe for a server component; it carries a `'use client'` banner, as the main entry does. `quoin-editor/engine`, `/view`, `/diff`, `/docx` and `/yjs` carry none. `npm run check:directives` checks the banner of each entry, and the consumer check renders the view, the diff and the Word export in plain Node.
- F-15 [TEST-1]: CI runs Playwright on Chromium, Firefox and WebKit, typechecks the packed package and resolves each of its entries on React 18 and 19, renders the server entries in plain Node, and the release workflow runs the consumer check before publishing.
- F-17 [A11Y-1]: Mod+Shift+Arrow and the block menu move a block one place, and every move, by keyboard or by drag, is announced with its new position (`e2e/tests/canvas/shortcuts.spec.ts`, `drag.spec.ts`).
- F-21 [A11Y-8]: the slash menu is a combobox with `aria-activedescendant` from the moment it opens, and its result count is announced.
- F-22 [A11Y-9]: the slash menu opens from the text typed, not from a key press, so a virtual keyboard or dictation opens it too.
- F-23 [A11Y-10]: an upload in flight no longer disables the focused file input, and one status region, mounted from the start, announces its progress.
- F-26 [CQ-11]: `BlockCanvas.tsx` and `BlockCard.tsx` are gone; the canvas file wires the engine, the view and the UI in 159 lines.
- F-28 [CQ-14]: one suggestion menu serves the slash menu and every other menu typed in the text, and the shortcuts dialog reads one table, which `scripts/keyboard-docs.test.ts` checks against the keymaps: the dialog lists only keys the code binds, and every key the canvas's own keymaps bind.
- F-29 [CQ-15, PKG-5]: the `badge`, `label` and `select` primitives are gone, with `@radix-ui/react-label` and `@radix-ui/react-select`.
- F-31 [CQ-17]: `toggleLinePrefix` is gone with the textarea helpers.
- F-32 [CQ-18, PKG-3]: one build with code splitting, so `quoin-editor` and `quoin-editor/headless` share each export, which `src/index.test.ts` checks against the built files.
- F-34 [A11Y-7]: the editor is one tab stop, held by the block the selection is in. The gutter's controls are left out of the tab order, Mod+/ opens the block menu from the text, and the arrows move between blocks.
- F-35 [A11Y-12]: every block menu item is named by the text it shows (`src/gutter/BlockMenu.test.tsx`).
- F-36 [A11Y-14]: the canvas no longer takes focus on mount unless `autoFocus` is set.
- F-37 [A11Y-16]: nothing animates or scrolls smoothly when the reader asks for reduced motion (`e2e/tests/canvas/reader-settings.spec.ts`).
- F-38 [A11Y-17]: on a touch screen the gutter shows one 44 px handle beside the block being edited, and a toolbar above the keyboard carries the editing tools.
- F-41 [A11Y-21]: the shortcuts dialog lists the canvas's keyboard model, the keyboard docs page adds the keys of the opt-in features, and the Accessibility docs page names what each test suite checks and what it does not.

### Security
- `toDocx` links a hyperlink only when its address is an absolute `http`, `https`, `mailto` or `tel` one; any other address, relative ones included, is written as plain text, since Word reads a relative address against the file's folder and a `\\host\share` address as a network share.
- `QuoinView` and `QuoinDiff` write the colour of a `highlight` token into a `style` attribute only when it is one colour value (a hex colour, a keyword, a colour function or a custom property), so a token cannot add a declaration of its own.

### Known gaps
Findings of #73 that 1.0 addresses only in part. Each part still open stays open in [#73](https://github.com/AmineSeboui/quoin-editor/issues/73); none has a follow-up issue yet.
- F-11 [API-1]. Fixed: extensions add commands, keymaps, input and paste rules, plugins and canvas UI through `defineExtension`, and `BlockCanvas` takes a ref. Remains: a block's `preview` still cannot write its data, and `BlockEditorProps` gained no `blockId`, `index` or `onRemove`.
- F-12 [PKG-2]. Fixed: dnd-kit, cmdk, tailwind-merge and class-variance-authority are gone, features beyond the core blocks are entries of their own, and `npm run check:size` holds every entry to a budget. Remains: the build turns tree shaking off, since Rollup would strip the `'use client'` banners, and leaves it to the host's bundler.
- F-14 [API-4, A11Y-15]. Fixed: `QuoinView` renders a document on a server, with real headings, lists and links, the canvas draws text formatted instead of raw markdown, and `toHTML` and `QuoinView` draw an image as a `figure` with `width`, `height`, `loading="lazy"` and its caption, and a file as a link. Remains: an empty alt still marks an image decorative silently, with no choice to make it so on purpose.
- F-20 [A11Y-6]. Fixed: a callout's tone is in its accessible name ("Callout, warning"), and `toHTML` writes a callout as `<aside role="note" data-tone>`, so colour is no longer the only cue. Remains: the light `--quoin-warning` keeps its 0.4 value, so the warning callout's rule keeps the contrast the review measured, 2.84:1 against its wash.
- F-30 [CQ-16]. Fixed: ESLint with typescript-eslint and react-hooks runs in CI, with a coverage gate of 90 percent of lines on the engine. Remains: no coverage threshold on the canvas or the hooks.
- F-33 [API-3]. Fixed: `icon` accepts any component. Remains: `initialData` stays optional when the data has required fields, and a definition has no `parse` or `migrate`.
- F-42 [A11Y-22]. Fixed: `color-scheme` is declared in light and dark. Remains: `--quoin-input` keeps its 0.4 values, which the review measured at 1.26:1 in light and 1.47:1 in dark for field borders.

## 0.4.2 (2026-10-15)

A metadata-only patch. The code is the same as 0.4.1 and nothing in the public API changes.

### Changed
- The repository moved to `AmineSeboui/quoin-editor`, so the `repository`, `homepage` and `bugs` fields of the package, and the README badges and links, point at the new repository and its documentation site, `https://amineseboui.github.io/quoin-editor`.
- This version is published with npm provenance from the new repository. The provenance of earlier versions still names the former repository, which no longer exists.

## 0.4.1 (2026-10-12)

A patch release that fixes the data-loss, accessibility and React 18 problems found in a review of 0.4.0. Nothing is removed from the public API.

### Fixed
- `useAutosave` saves the newest edit when its component unmounts, and when the page is hidden or closed (`pagehide`, or the tab turning hidden), instead of dropping up to one debounce interval of typing (F-01).
- `useAutosave` keeps one save in flight. Edits made while it runs are sent in a single follow-up save with the newest payload, so an older payload can no longer land last (F-05).
- A save that fails after `useAutosave` has unmounted no longer schedules retries nobody can stop (F-06).
- A save that fails for good no longer retries forever: retries stop after `maxRetries` (default 8) or when `isRetryable` says no, `status` becomes `failed` and `error` holds the reason. A success clears the error and any pending backoff (F-05).
- An image block records its `storageKey` as soon as the upload finishes, before the picture is measured. With overlapping uploads the last pick wins, and a late measurement never overwrites a newer image. Replacing an image drops the previous image's width and height, so a picture that cannot be measured is never stored with another picture's size (F-07).
- `UploadField` waits for an async `onUploaded` and reports its rejection through `onError`, once. The "Image attached" text no longer carries a check mark that screen readers read out (F-25).
- The markdown surface and the empty-document starter ignore keys that belong to an IME composition. Committing a candidate with Enter no longer continues a list, and Backspace, Tab and `/` inside a composition no longer exit a list, indent or open the palette (F-08).
- On macOS the shortcuts use Command, so Ctrl+B, Ctrl+E and Ctrl+K keep their system text meanings. Elsewhere they use Ctrl, as before (F-27).
- A lagging host that echoes the canvas back no longer rewinds it. An array the canvas emitted is recognised however late it comes back, so the limit of 64 unacknowledged emissions is gone, and a structural copy of one of the last 64 counts as its echo. Stores that clone the document on the way through, such as Redux, Zustand or a server round trip, keep every keystroke while they are within 64 edits (F-10).
- Keyboard focus is visible on buttons, inputs, textareas, selects, the dialog close button, the markdown surface and the starter: a solid 2 px outline in `--quoin-ring`, which reaches 3:1 against the page and popover in light and dark, and which Windows forced colours mode keeps (F-04, F-18).
- A highlighted row in a menu, the slash palette or a select carries an inset bar as well as a background, and the Delete label and shortcut hints reach 4.5:1 on it (F-19, F-40).
- React 18 works: `Button`, `Input` and `Textarea` forward refs, so the refs that focus return, the drag handle and the menu triggers rely on are no longer dropped, and layout effects no longer run during server rendering. CI now checks the packed package on React 18 and 19 (F-03).
- Inserting a block focuses and scrolls to it inside its own canvas, so two canvases on one page no longer interfere (F-16).
- The last inserted block no longer reopens, and takes focus, when `readOnly` is toggled or the host undoes a change (F-24).
- Inserting a block from the slash palette closes the source block's editor, so one editor is open at a time (F-39).

### Changed
- `useAutosave` gains the `'failed'` status, the `maxRetries`, `isRetryable` and `flushOnHide` options, and `error` and `flush()` on its result. When `save` resolves `{ ok: false }`, that value is the `error`.
- `UploadFieldProps.onUploaded` may return a promise.
- `useAutoGrow` is typed to return `React.RefObject<T>`, so the ref it returns is accepted by React 18 and 19 types.
- Default tokens: light `--quoin-ring` is darker, dark `--quoin-ring` is lighter, and light `--quoin-destructive` and `--quoin-muted-foreground` are slightly darker. A host that maps `--quoin-ring` to a pale colour should give it one that reaches 3:1.
- A host that does not echo `onChange` and restores a copy of a state from its last 64 edits now sees it ignored as a late echo. Remount the canvas with a React `key` to force the reset.
- The package description, keywords and author are updated.

### Docs
- The README no longer warns that a store which clones the document loses text.
- New Accessibility and Stability sections, which name the gaps that remain in 0.4.
- `--quoin-ring` is documented.

## 0.4.0 (2026-10-12)

### Breaking
- Each callout tone draws in a colour of its own. New tokens: `--quoin-info`, `--quoin-success` and `--quoin-warning`.

## 0.3.0 (2026-10-11)

Answers an integrator's report from 0.1.1.

### Added
- The core block data shapes are exported (`MarkdownBlockData`, `CalloutBlockData`, `CodeBlockData`, `ImageBlockData`, `FileBlockData`, `CoreBlockData`) and documented, with a test that reads the keys back from each editor.
- A block definition may omit `editor` for content that is never edited in the canvas; omitting both `editor` and `preview` is a type error.
- A read-only canvas warns once per type, in the developer console, when a definition has no `preview`.

### Changed
- `useAutosave`'s `save` may return anything; only an explicit `{ ok: false }` (or a rejection) counts as a failure.
- `defineBlock` defaults its data type to `Record<string, unknown>`.
- A block whose type nobody registered no longer offers an Edit button.

### Docs
- Tailwind v3, v4 and no-Tailwind setups, and the install footprint.

## 0.2.0 (2026-10-10)

### Breaking
- Every CSS custom property is prefixed `--quoin-`.
- All of the package's CSS ships under one top-level `quoin` cascade layer.
- Tailwind's theme is imported by reference, so its tokens no longer land on the host's `:root`.
- Utilities are built from the package's components only, not from the README prose.

### Added
- `onDelete` tells the host which block a deletion removed and the index it held.
- `UploadField` and `FilePickerButton` are exported for custom blocks.

### Fixed
- Builds under Tailwind v3 hosts.

## 0.1.1 (2026-10-09)

### Fixed
- `package.json` is exposed through the `exports` map, so tooling can read the manifest.
- The headless surface is re-exported from the main entry.
- The caret lands where a click fell instead of at the top of the block.
- Every emission a lagging host has not echoed yet is recognised, so delayed `onChange` handling no longer loses typing.
- A block type nothing registered is drawn and reported through `onError`.
- `useBlockList` caps the removals it keeps for undo.

### Changed
- The markdown commit the keymap is keyed on is memoised.

### Docs
- A custom block reaching `upload` through `useQuoin`, and a host token collision with its escape hatch.

## 0.1.0 (2026-10-09)

First release of Quoin, published on npm as `quoin-editor` (npm rejects the bare name `quoin` as too similar to an existing package).

### Added
- `BlockCanvas`: a controlled React block editor (`blocks` and `onChange`) with drag to reorder, block inserters, a block actions menu and a read-only mode.
- Five core block types: markdown, callout, code, image and file, plus an open registry through `defineBlock` with plain React `editor` and `preview` components.
- A markdown surface with keyboard shortcuts, list continuation, indentation and a slash palette.
- Host-owned uploads through an injected `upload` function and `resolveAssetUrl`.
- `quoin-editor/headless`: the markdown text transforms with no UI dependency.
- Scoped styles with a class-based dark mode.
