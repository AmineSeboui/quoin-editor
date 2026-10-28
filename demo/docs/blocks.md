---
title: Code, image and file blocks
description: How the code, image and file blocks are typed into, selected, uploaded to and highlighted, from the mouse or the keyboard.
---

# Code, image and file blocks

## Code blocks

A code block is typed in place: Tab and Shift+Tab indent and outdent the selected lines, Enter keeps the indentation of the line, the arrows leave the block from its first and last lines, and Backspace in an empty block turns it into a paragraph. Its header holds a language picker (Alt+F10 from the code reaches it) and a copy button. The canvas draws code blocks, and offers to insert them, while `blockTypes` registers `CODE`, as `coreBlocks` does.

Pass `highlight` to colour the code. It gets the code and the block's language as stored, which can be an alias such as `ts`, and returns one array of tokens per line, `{ text, color?, className? }`, whose texts spell the line exactly. Wrap Shiki, Prism or highlight.js in one, and keep the function stable. A highlighter that throws, or whose tokens do not spell the code, leaves the code as plain text. A token's `color` is left out when it holds what could leave the `color` declaration or load a resource: any of `;` `{` `}` `\` `"` `'` `<` `>` `!`, a `/*`, or `url(`, `image(`, `image-set(` or `expression(` in any case. So a value such as `red;background-image:url(...)` is not drawn, in a server render of the canvas too, as `QuoinView` leaves it out, while `var(--shiki-foreground, #24292e)`, `hsl(var(--primary))`, `color-mix()` and `light-dark()` are drawn.

```tsx
import { BlockCanvas, type CodeHighlighter, type QuoinBlock } from 'quoin-editor';

const keyword = /^(?:const|let|function|return)$/;

const highlight: CodeHighlighter = (code) =>
  code.split('\n').map((line) =>
    line.split(/\b/).map((text) => (keyword.test(text) ? { text, color: '#d73a49' } : { text })),
  );

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} highlight={highlight} />;
}
```

## Image blocks

An image block with no picture yet offers an upload button, a link to embed instead, and room to drop or paste an image file. An image file pasted or dropped anywhere else in the canvas becomes an image block of its own. The upload's `storageKey` is written as soon as `upload` resolves, then the picture's `width` and `height` once it has been measured from `resolveAssetUrl(storageKey)`. Of two uploads into one block, the one started last wins, and its measurement is the only one written.

The picture is drawn from `url` when the block has one, otherwise from `resolveAssetUrl(storageKey)`. A picture that cannot be resolved or loaded, or whose key resolves to anything but an http, https, blob, data or relative address, is drawn as missing, with its alt text. An image without alt text is announced as "Image, no description", and is written with `alt=""` by `toHTML`, `QuoinView`, `QuoinDiff` and `toDocx`. State that an image is meant to have no description with `decorative: true` in its data: the alt text popover has a "Decorative image" checkbox that stores it and clears the alt text, and typing alt text unchecks it. A decorative image is also written with `alt=""`, and `decorative` is kept only when true, in lossless markdown and through `quoin-editor/yjs` as `alt` is. An editable canvas draws a "No alt text" badge on an image with neither alt text nor `decorative`, which opens the popover; a read-only canvas, `QuoinView` and `toHTML` draw no badge. The labels are `decorativeImage` and `noAltBadge`.

The arrows select an image as a whole. Enter on the selected image, or a key typed on it, takes the caret into its caption, which is inline markdown like any text. While the image is selected, a toolbar offers left, centre and right alignment, a new upload in its place, its alt text, a download and Delete: Alt+F10 reaches it, the arrows walk it, Tab goes on to the width handles and Escape goes back to the image. The handles on either side of the picture are sliders: drag one, or press the arrows, Home and End on a focused one, to set the width in steps of 5 percent, from 10 to 100 percent of the line. A read-only canvas draws the picture and a caption it has, and nothing to edit.

## File blocks

A file block with no file yet offers an upload button and room to drop or paste any file. A file other than an image pasted or dropped anywhere else in the canvas becomes a file block of its own. Once `upload` resolves, the block keeps the `storageKey`, `filename` and `size` it returned, and the type the file declares as `mime`, in one step of history. Of two uploads into one block, the one started last wins.

A file block holding a file is a card: an icon for its type, chosen from the top-level type of `mime` (image, audio, video or text) and else from the extension of its name, the name, the size in binary units (`1.5 KB`), and a Download link to `resolveAssetUrl(storageKey)`, named "Download" and the file's name, which opens in a new tab where the browser cannot download it. A card whose key cannot be resolved, or resolves to anything but an http, https, blob, data or relative address, has no link. The size is worded by the `fileSize` label, so a host can write it in its own language.

The arrows select a card as a whole, and it is announced as "File" and the file's name. Enter on the selected card goes on in a new line under it, and a key typed on it never replaces it; on an empty file block, Enter focuses the upload button. While the card is selected, a toolbar offers a new upload in its place and Delete: Alt+F10 reaches it, the arrows walk it, Tab goes on to the Download link and Escape goes back to the card. A read-only canvas draws the card with its link in the tab order, and nothing to edit.
