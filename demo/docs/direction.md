---
title: Right to left
description: How the canvas follows a page that runs right to left, what stays physical on purpose, and what is not covered yet.
---

# Right to left

The canvas reads the direction of the page it is on and lays itself out to match, so an Arabic, Hebrew, Persian or Urdu document is drawn the way its reader expects. Nothing is detected and nothing is configured: the page says which way it runs, and the editor follows.

## Turning it on

Set the direction on the page, or on any element above the canvas, with either the attribute or the stylesheet:

```html
<html dir="rtl">
```

```css
.my-editor { direction: rtl; }
```

Both work. The canvas reads the direction as it is laid out rather than the attribute alone, so a host that sets it in CSS is covered.

A page can also turn round while the canvas is on it, as when a reader switches the language. The canvas follows when the change is a `dir` attribute, a class or an inline style on the canvas or on an element around it: the gutter moves to the other side at once, and the next menu opens the new way round. A stylesheet that turns the page round without any of those changing, such as a media query, is only picked up by a canvas mounted after it, so give the canvas a new `key` in that case.

Direction and language are separate. Turning the page round does not translate it, and passing a locale pack does not turn it round. Most hosts want both:

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { arLabels } from 'quoin-editor/locale-ar';
import 'quoin-editor/styles.css';

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return (
    <div dir="rtl">
      <BlockCanvas blocks={blocks} onChange={onChange} labels={arLabels} />
    </div>
  );
}
```

[Localization](../localization/) covers the packs.

## What follows the page

- **The text and the blocks.** Indentation, list markers, the task checkbox and the toggle chevron all sit on the side the text starts from, and a closed toggle points the way the text runs on.
- **The gutter and dragging.** The handle and the add button sit beside the block on the correct side, the drop line mirrors, and dragging towards the start of the line nests rather than lifts.
- **Every menu and toolbar.** The slash menu, the bubble toolbar, the block menu, the link popovers, the table menus, the emoji picker and the rest open on the side the page starts from.
- **The arrows.** A horizontal arrow names a side of the screen, so where the lines run right to left the left arrow walks *forward* through the document. That holds for the caret at a block edge, for Shift with an arrow over a formula or a mention, and for the arrows that walk a toolbar or the emoji grid.
- **The table.** Columns are drawn the other way round, and the column menu puts a column where it says: "insert column left" puts it on the left of the screen, whichever end of the document that is.

## What stays physical on purpose

Three things name a side of the screen and keep meaning it, whichever way the page runs.

**A block's alignment.** `left`, `center` and `right` are a writer's explicit choice, made by looking at the screen. They are stored as they were chosen and drawn as they were chosen, so a document does not change shape when it is opened on a page that runs the other way. There is no "start" or "end" alignment.

**The resize handles.** On an image or a table column, the left arrow moves the edge left and the right arrow moves it right. The alternative makes the handle travel opposite to the key under the finger.

**Code.** A code block is laid out left to right whatever the page does, because code is, and its caret and its scrolling follow.

## What is not covered

- **A direction per block.** One canvas runs one way. A right to left paragraph inside a left to right document is laid out by the browser as bidirectional text, which handles the words, but the block's own furniture stays on the document's side.
- **Mixed text beyond what the browser does.** Quoin adds no bidi isolation of its own around inline code, links or mentions.
- **Composition over an atom in Chromium.** Typing with an input method directly onto a selected formula or mention may drop the composed text. It has not been reproduced by hand, only through the automation protocol.

## How it is kept

The stylesheets are written in logical properties, and `npm run check:css` fails on a physical one. Where something really is physical, as the three above are, the reason is written on the line above it:

```css
.quoin .quoin-code-text {
  /* physical: code runs left to right whatever the page does */
  text-align: left;
}
```

The check also fails on a reason that no longer excuses anything, so the exceptions cannot rot into a list nobody reads.

The Playwright suite has projects of its own that serve the editor right to left, and they run the specs that are written for direction, including an accessibility scan in Arabic in both light and dark mode.
