---
title: AI actions
description: Stream your own model's answers into the document through one callback: continue, improve, translate, summarize and more, accepted in one undo step.
---

# AI actions

`quoin-editor/ai` streams your model's answers into the document. Quoin never calls a model itself: `aiExtension({ stream })` takes a function that answers each request with an async iterable of markdown chunks and stops when the signal aborts, so any provider, proxy or SDK fits behind it.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { aiExtension, type AiStream } from 'quoin-editor/ai';
import { useState } from 'react';

// Your server relays the request to a model and streams its text back.
const stream: AiStream = async function* (request, signal) {
  const response = await fetch('/api/ai', { method: 'POST', body: JSON.stringify(request), signal });
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  for (let next = await reader.read(); !next.done; next = await reader.read()) yield next.value;
};

export function AssistedEditor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  const [extensions] = useState(() => [aiExtension({ stream })]);
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

Each request is `{ action, prompt?, selection, context, language? }`. `action` is one of `continue`, `improve`, `fix`, `shorten`, `lengthen`, `simplify`, `tone`, `translate`, `summarize`, `explain` and `custom`; `prompt` is what the writer typed, the request itself for `custom`, the tone for `tone` and the language to translate to for `translate`. `selection` is the markdown of the selected text, or of the block the caret is in; `context` is the document's markdown, cut to 8,000 characters around the selection at block boundaries; `language` is the `lang` of the closest element around the canvas that has one.

The AI menu opens from Ask AI in the bubble toolbar and in the block menu, from Ask AI and Continue writing in the slash menu's AI group, and from a Space on an empty paragraph that has held no text since focus last arrived in the canvas; a second Space, or Escape, then types the space. The writer types a request or picks an action, and the answer streams in as it comes: below its text for Continue writing, Summarize, Explain and a request typed with nothing selected, after its text, which shows as struck through, for the actions that rewrite it. It is drawn at most once a frame, with unfinished markdown closed for display, over the canvas under the block it is for, which keeps room for it so it covers no text (a `margin-bottom` of `var(--quoin-ai-room)` on that block, `[data-quoin-ai-room]`; a host rule that overrides it lets the answer cover the next block, and content below the answer moves down as it grows, except when the reader has scrolled past that block: then the scroll follows the growth, so what they are reading stays still, in WebKit without scroll anchoring as in other browsers); it is never part of the document, so it is not saved, copied, reached by the caret or read by assistive technology until it is complete or stopped, when it is announced once. Under it, Writing and Stop while it streams, then Accept, Discard, Retry and a field for a follow-up, which asks for a change to the answer and replaces it. Escape in the text takes focus to that bar.

Accept applies the answer in one undo step, a transaction whose origin is `ai`, read with the engine's markdown parser as a paste is, so its HTML stays text and unsafe links are dropped. Edits made while it streams, a collaborator's among them, move its target with them; if its text was deleted meanwhile, Accept puts the answer where the text was and says so, and if its block was deleted the stream stops and Accept puts the answer as blocks of their own beside the block that was next to it. `selection` and `context` are plain markdown: the spaces the engine keeps as `&#32;` reach the host as spaces. Stop aborts the signal and keeps what streamed. A stream that rejects, throws or yields something other than a string goes to `onError` and shows inline with Retry. A new request, Discard and unmounting the canvas abort the signal too. A read-only canvas shows no AI entry points, and making a canvas read-only ends any answer it shows. Strings come from `AiLabels` (English in `englishAiLabels`), overridden through `aiExtension({ labels })`.
