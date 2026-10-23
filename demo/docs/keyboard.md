---
title: Keyboard
description: Every key the canvas and its opt-in features answer to, as macOS and Windows or Linux write them, the same list the shortcuts dialog shows.
---

# Keyboard

Every key below works on the canvas, and the shortcuts dialog (Mod+Shift+/ from the canvas) lists the same keys in the reader's own words, written for the platform it runs on. Mod is Command on a Mac and Control elsewhere. A test (`scripts/keyboard-docs.test.ts`) reads the keymaps the canvas and the opt-in features bind, and the few keys the view reads from the key event itself: a key this page lists that the code no longer binds fails it, and so does a key the canvas binds that this page or the dialog leaves out.

## Text

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Bold | ⌘B | Ctrl+B |
| Italic | ⌘I | Ctrl+I |
| Underline | ⌘U | Ctrl+U |
| Strikethrough | ⌘⇧S | Ctrl+Shift+S |
| Code | ⌘E | Ctrl+E |
| Highlight | ⌘⇧H | Ctrl+Shift+H |
| Link | ⌘K | Ctrl+K |
| Line break | ⇧Enter | Shift+Enter |
| Undo | ⌘Z | Ctrl+Z |
| Redo | ⌘⇧Z or ⌘Y | Ctrl+Shift+Z or Ctrl+Y |

## Blocks

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Split the block | Enter | Enter |
| At the start: turn into text, outdent or join the block above | Backspace | Backspace |
| At the end: join the next block | Delete | Delete |
| Text | ⌘⌥0 | Ctrl+Alt+0 |
| Heading 1 | ⌘⌥1 | Ctrl+Alt+1 |
| Heading 2 | ⌘⌥2 | Ctrl+Alt+2 |
| Heading 3 | ⌘⌥3 | Ctrl+Alt+3 |
| Heading 4 | ⌘⌥4 | Ctrl+Alt+4 |
| Heading 5 | ⌘⌥5 | Ctrl+Alt+5 |
| Heading 6 | ⌘⌥6 | Ctrl+Alt+6 |
| Numbered list | ⌘⇧7 | Ctrl+Shift+7 |
| Bulleted list | ⌘⇧8 | Ctrl+Shift+8 |
| To-do list | ⌘⇧9 | Ctrl+Shift+9 |
| Check a task or open a toggle | ⌘Enter | Ctrl+Enter |
| Indent | Tab | Tab |
| Outdent | ⇧Tab | Shift+Tab |
| Move up | ⌘⇧↑ | Ctrl+Shift+↑ |
| Move down | ⌘⇧↓ | Ctrl+Shift+↓ |
| Duplicate | ⌘D | Ctrl+D |

## Selection

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Select the block | Escape | Escape |
| Open the selected block's editor | Enter | Enter |
| Leave a block's editor | Escape | Escape |
| Select all | ⌘A | Ctrl+A |
| Extend the selection up | ⇧↑ | Shift+↑ |
| Extend the selection down | ⇧↓ | Shift+↓ |

## Navigation

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Previous line | ↑ | ↑ |
| Next line | ↓ | ↓ |
| At the start: end of the previous block | ← | ← |
| At the end: start of the next block | → | → |
| Leave the editor | Escape, then Tab | Escape, then Tab |

## Menus

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Commands | / | / |
| Block menu | ⌘/ | Ctrl+/ |
| Text formatting | ⌥F10 | Alt+F10 |
| Keyboard shortcuts | ⌘⇧/ | Ctrl+Shift+/ |
| Close a menu | Escape | Escape |

## Opt-in features

Each of these keys works once its feature's extension is in `extensions`, directly or through `catalogue()`.

| Action | macOS | Windows and Linux |
| --- | --- | --- |
| Find and replace | ⌘⇧F | Ctrl+Shift+F |
| Comment on the selection | ⌘⌥M | Ctrl+Alt+M |
| Ask AI, on an empty paragraph | Space | Space |
| Next table cell | Tab | Tab |
| Previous table cell | ⇧Tab | Shift+Tab |

In the find panel, Enter and Shift+Enter move to the next and the previous match. With an anchor of a comment under the caret, Mod+Alt+M opens its thread with focus in the reply field. In the AI menu, the arrows choose an action and Enter runs it; a second Space, or Escape, types the space instead. The toolbar beside a pasted link is reached with Alt+F10, and Escape leaves it.
