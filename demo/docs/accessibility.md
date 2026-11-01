---
title: Accessibility
description: What Quoin's test suites check for keyboard, screen reader and colour access, and what is not checked yet.
---

# Accessibility

Every claim on this page is held by a test that runs in CI.

## What the tests check

- **axe, across the states of the canvas.** In a real browser, axe runs over the canvas in light and dark mode at rest and with the slash menu, the block menu, the context menu, the bubble toolbar, the link popover and the shortcuts dialog open, and on a phone with the editing tools shown. It runs over the headless editor during a composition, with a closed toggle, read-only with a selection across blocks, and on an empty document. Unit tests run it over each menu, toolbar, popover and block of the canvas and of the opt-in features.
- **Writing with the keyboard alone.** A browser test builds a document with a heading, formatting, a link, a list and a callout without the mouse, moves a block with Mod+Shift+Arrow, and leaves the editor with Escape then Tab.
- **Announcements.** A block moved with the keyboard is announced with its new position ("Block moved to position 2 of 5"), a deleted block is announced with the shortcut that undoes it, and a move made by dragging is announced too.
- **Colour.** The default light and dark tokens are held to a focus ring of 3:1 or more against the page, a popover and a selected block, and to body, muted and destructive text of 4.5:1 or more on the page, a popover and a highlighted row. Focusable controls draw focus as a solid outline, never hidden and never a translucent ring. The outline of the current find match is held to 3:1 or more against its orange wash and the page, in both themes.
- **Reader settings.** Browser tests check that selected blocks and focused text keep an outline in system colours under forced colours, and that nothing animates or scrolls smoothly when the reader asks for reduced motion.
- **IME.** Browser tests check that compositions, dead keys included, commit once into the document, and that text a script or a browser extension rewrites in another block during a composition reaches the document when the composition ends.

The keyboard shortcuts dialog, Mod+Shift+/ from the canvas, lists the canvas's keyboard model. The [keyboard page](https://amineseboui.github.io/quoin-editor/docs/keyboard/) lists it for both platforms and adds the keys of the opt-in features, such as comments and AI.

## What is not checked yet

- A manual pass with NVDA and VoiceOver is not recorded. The suites above check roles, names and live region text, not what a given screen reader speaks.
- Focus mode (`statsExtension({ focusMode: true })`) dims the blocks the selection does not touch to 40 percent, so the dimmed text falls below 4.5:1 by design while it is dimmed. Nothing is hidden from assistive technology.
