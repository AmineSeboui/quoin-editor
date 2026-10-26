---
title: Collaboration
description: Real-time co-editing through a Yjs document and your own provider, with an undo of your own changes and collaborators' carets and avatars.
---

# Collaboration

`quoin-editor/yjs` syncs a canvas through a [Yjs](https://yjs.dev) document, with an undo that takes back only your own changes. Install `yjs` beside the package (it is an optional peer dependency) and bring your own provider, such as `y-websocket`; Quoin never opens a connection itself.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';
import { useEffect, useState } from 'react';
import type * as Y from 'yjs';

// The part of a provider such as y-websocket's WebsocketProvider this needs: whether it has synced, and its event.
type Provider = {
  synced: boolean;
  on(event: 'sync', listener: (synced: boolean) => void): void;
  off(event: 'sync', listener: (synced: boolean) => void): void;
};

export function SharedEditor({ doc, provider, starting }: { doc: Y.Doc; provider: Provider; starting: QuoinBlock[] }) {
  const [synced, setSynced] = useState(provider.synced);
  const [extensions] = useState(() => [collaborationExtension(yjsCollaboration({ doc, user: { name: 'Ada' } }))]);
  const [blocks, setBlocks] = useState(starting);
  useEffect(() => {
    const listen = (done: boolean) => {
      if (done) setSynced(true);
    };
    provider.on('sync', listen);
    return () => provider.off('sync', listen);
  }, [provider]);
  // Connect only once the provider has synced, so an empty document is seeded by one client alone.
  if (!synced) return null;
  return <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} />;
}
```

The whole document lives in one `Y.Text`, `doc.getText('quoin')` (`field` names another). Each block starts with an embedded `Y.Map` holding its `id`, `type`, `indent` and `attrs` (a `Y.Map` of its own, so two people changing different attrs of one block both keep their change), and each region with an embed naming it (`{ r: 'text' }`), followed by its characters, whose formatting attributes are the marks (`{ bold: true }`, `{ link: { href } }`, `{ 'comment:c1': true }`); atoms are embeds `{ atom, attrs }`. Blocks and marks the canvas does not know are kept as they are. Pressing Enter puts a block marker into the text and Backspace at the start of a line takes one out, so what someone else types in that line at the same moment stays where they typed it. Edits that cross at the same moment can leave the text in a shape no single client wrote (characters outside any region, two markers of one block); every client reads such a text the same way, without writing anything back, so all of them still show the same document. Text someone types into a block that another person deletes at the same moment is kept: it shows up at the end of the region before it in the document, which can be a block above a divider or an image. When a region later appears between that text and the region it shows up in, as when a code block above it becomes a paragraph, the text moves into the new region, on every client alike. The same rule means that typing into a block whose region another edit took out can bring along text that was waiting before it, such as a line someone joined into a block another person deleted at the same moment: that text then shows one block higher, the same on every client, and nothing is lost. A text block or a table cell whose region another edit took out reads as empty, and typing into it writes the region again. A table that one client loaded from your blocks and another read from the shared document can hold its alignment in either form, no `align` key or `align: [null, null]` for columns with none: the editor and `QuoinDiff` treat the two as the same table, so a host that compares saved JSON should normalise `align` first. When two people change one block's type at the same moment, every client ends with the same type, and text that the other change put in a region this type does not have shows in this type's own region; a code block's code is kept beside the text rather than in it, so it is not shown when another type wins. When the canvas connects, a shared document with content replaces the canvas's blocks, and an empty one takes them; two clients that connect to an empty document before their provider has synced would both fill it, so connect after the provider's first sync, or pass `seed: false` to all clients but one. Moving a block takes it out of the text and writes it again where it goes, so an edit someone makes inside a block being moved at the same moment is lost; every client still ends with the same document. Undo and redo go through a `Y.UndoManager` that tracks this client's changes alone, grouped as the canvas groups typing. It lives as long as the `yjsCollaboration`, so an editor that disconnects and connects again, as `editor.mount()` after its unmount, can still undo what it did before; the seeding of an empty document on the first connect is never undone. An editor connects only while mounted: edits a headless editor makes while unmounted stay in that editor and are not sent when it connects again, which takes the shared document as it is. Keep the editor mounted while anyone edits it, or load it again from the shared document. A chain can hold them only alone: `editor.chain().undo().run()` undoes, but a chain that holds other commands as well, such as `editor.chain().undo().selectAll().run()`, does nothing under a collaboration. Call `editor.commands.undo()`, or `controller.run(undo)` with the controller of the canvas's handle. One `yjsCollaboration` serves one editor at a time: build it with the editor, as above, and a second editor it is given stays unconnected and is reported to its `onError` option; presence on that second editor writes nothing to the awareness, so collaborators keep seeing the first editor's person and selection while either canvas mounts or unmounts. A change from the shared document that does not apply to the editor, which would mean the two have drifted apart, is reported there too, as the error applying it raised, and the editor then takes the document as the shared text reads. This `onError` belongs to the adapter, which has no canvas of its own: the canvas's `onError` does not hear these, so pass both the same handler to hear about every failure in one place. Recent releases of `lib0`, which `yjs` depends on, declare types that need TypeScript 5.7: on an older TypeScript, set `skipLibCheck` or hold `lib0` at 0.2.111.

## Showing who else is here

`quoin-editor/presence` shows the people your provider's awareness knows: each one's selection tinted with their colour, their caret with their name, small avatars of their initials in a narrow gutter beside the block they are in, and, through the canvas's live region, who joined and who left. It is an entry of its own, so a worker or a server that only syncs through `quoin-editor/yjs` loads none of the canvas. Give `yjsCollaboration` the provider's awareness, such as `provider.awareness` of `y-websocket`, and a `user` with a name and a colour; Quoin never makes one up, and a colour that is not a plain CSS colour is left out. Pick colours that white text reads well on, since names and initials are drawn in white.

```tsx
import { presenceExtension } from 'quoin-editor/presence';
import { collaborationExtension, yjsCollaboration, type YjsAwareness } from 'quoin-editor/yjs';
import { useState } from 'react';
import type * as Y from 'yjs';

export function useSharedExtensions(doc: Y.Doc, awareness: YjsAwareness) {
  const [extensions] = useState(() => {
    const user = { name: 'Ada Lovelace', color: '#b91c1c' };
    const collaboration = yjsCollaboration({ doc, awareness, user });
    return [collaborationExtension(collaboration), presenceExtension(collaboration)];
  });
  return extensions;
}
```

Each client writes `{ user: { name, color }, selection }` to its awareness state, the selection's ends given by block id, region and offset with a Yjs relative position beside them, so a caret stays on its character while others type before it. The selection is written at most every 50 ms, and only while the canvas is focused and editable: on blur or in read-only it is cleared, so others stop showing it. Carets are drawn over the text rather than in it, so they never change how your own caret moves, what you select, copy or compose; they are hidden from assistive technology and take no pointer or focus. A collaborator's name fades after 2 seconds without a move, and a long name is cut short with an ellipsis (the avatars' accessible name keeps it whole). The avatars' gutter takes 24 px at the end of every line of a canvas with presence, whether or not anyone else is there, so the text never reflows as people come and go; leave room for it in a narrow layout. A name label that reaches the canvas's side is cut off there, and a caret in a part of the document that scrolls on its own, such as a wide table, stays inside it and scrolls with it. Nothing a collaborator does scrolls the page or moves the focus; a block their change leaves selected as a whole comes into view with your next change, and a change your code makes while their caret moves scrolls as it would alone. An announcement stays in the live region until you, not a collaborator, change something. Strings come from `PresenceLabels` (English in `englishPresenceLabels`), overridden through `presenceExtension(collaboration, { labels })`.
