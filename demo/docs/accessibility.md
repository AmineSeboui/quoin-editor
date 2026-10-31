---
title: Accessibility
description: What Quoin's test suites check for keyboard, screen reader and colour access, in which files, and what is not checked yet.
---

# Accessibility

Every claim on this page is held by a test that runs in CI. The page names the file.

## What the tests check

- **axe, across the states of the canvas.** `e2e/tests/canvas/a11y.spec.ts` runs axe over the canvas in light and dark mode at rest and with the slash menu, the block menu, the context menu, the bubble toolbar, the link popover and the shortcuts dialog open, and on a phone with the editing tools shown. `e2e/tests/headless/a11y.spec.ts` runs it over the headless editor during a composition, with a closed toggle, read-only with a selection across blocks, and on an empty document. Unit tests run it over each menu, toolbar, popover and block of the canvas and of the opt-in features, 36 test files in `src`.
- **Writing with the keyboard alone.** `e2e/tests/canvas/keyboard-only.spec.ts` builds a document with a heading, formatting, a link, a list and a callout without the mouse, moves a block with Mod+Shift+Arrow, and leaves the editor with Escape then Tab.
- **Announcements.** `e2e/tests/canvas/shortcuts.spec.ts` checks that a block moved with the keyboard is announced with its new position ("Block moved to position 2 of 5"), and that a deleted block is announced with the shortcut that undoes it. `e2e/tests/canvas/drag.spec.ts` checks that a move made by dragging is announced too.
- **Colour.** `src/ui/tokens.test.ts` holds the default light and dark tokens to a focus ring of 3:1 or more against the page, a popover and a selected block, and body, muted and destructive text to 4.5:1 or more on the page, a popover and a highlighted row. `src/ui/focus.test.tsx` checks that focusable controls draw focus as a solid outline, never hidden and never a translucent ring. `src/extensions/find/find-contrast.test.ts` holds the outline of the current find match to 3:1 or more against its orange wash and the page, in both themes.
- **Reader settings.** `e2e/tests/headless/media-queries.spec.ts` and `e2e/tests/canvas/reader-settings.spec.ts` check that selected blocks and focused text keep an outline in system colours under forced colours, and that nothing animates or scrolls smoothly when the reader asks for reduced motion.
- **IME.** `e2e/tests/headless/ime.spec.ts` checks that compositions, dead keys included, commit once into the document, and that text a script or a browser extension rewrites in another block during a composition reaches the document when the composition ends.

The keyboard shortcuts dialog, Mod+Shift+/ from the canvas, lists the canvas's keyboard model. The [keyboard page](https://amineseboui.github.io/quoin-editor/docs/keyboard/) lists it for both platforms and adds the keys of the opt-in features, such as comments and AI.

## What is not checked yet

- A manual pass with NVDA and VoiceOver is not recorded. The suites above check roles, names and live region text, not what a given screen reader speaks.
- Focus mode (`statsExtension({ focusMode: true })`) dims the blocks the selection does not touch to 40 percent, so the dimmed text falls below 4.5:1 by design while it is dimmed. Nothing is hidden from assistive technology.
