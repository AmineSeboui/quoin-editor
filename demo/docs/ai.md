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

Each request is `{ action, prompt?, selection, context, language?, actionId? }`. `action` is one of `continue`, `improve`, `fix`, `shorten`, `lengthen`, `simplify`, `tone`, `translate`, `summarize`, `explain` and `custom`; `prompt` is what the writer typed, the request itself for `custom`, the tone for `tone` and the language to translate to for `translate`. `selection` is the markdown of the selected text, or of the block the caret is in; `context` is the document's markdown, cut to 8,000 characters around the selection at block boundaries; `language` is the `lang` of the closest element around the canvas that has one. `actionId` is there only when the writer chose one of your own actions, as [Your own actions](#your-own-actions) explains.

The AI menu opens from Ask AI in the bubble toolbar and in the block menu, from Ask AI and Continue writing in the slash menu's AI group, and from a Space on an empty paragraph that has held no text since focus last arrived in the canvas; a second Space, or Escape, then types the space. The writer types a request or picks an action, and the answer streams in as it comes: below its text for Continue writing, Summarize, Explain and a request typed with nothing selected, after its text, which shows as struck through, for the actions that rewrite it. It is drawn at most once a frame, with unfinished markdown closed for display, over the canvas under the block it is for, which keeps room for it so it covers no text (a `margin-bottom` of `var(--quoin-ai-room)` on that block, `[data-quoin-ai-room]`, which is the answer's height and 8 px less the room your styles already leave there: the block's bottom padding, when it draws neither a bottom border nor a background there, and the row gap of a flex column or grid it is laid out in when another block follows it, which the answer takes first so the two do not add up; a margin of your own on the block gives way to it; a host rule that overrides it lets the answer cover the next block, and content below the answer moves down as it grows, except when the reader has scrolled past that block, in the page, in a box around the canvas or in the canvas itself when it scrolls: then the scroll follows the growth, so what they are reading stays still, in WebKit without scroll anchoring as in other browsers, and at once even on a page with smooth `scroll-behavior`); it is never part of the document, so it is not saved, copied, reached by the caret or read by assistive technology until it is complete or stopped, when it is announced once. Under it, Writing and Stop while it streams, then Accept, Discard, Retry and a field for a follow-up, which asks for a change to the answer and replaces it. Escape in the text takes focus to that bar.

Accept applies the answer in one undo step, a transaction whose origin is `ai`, read with the engine's markdown parser as a paste is, so its HTML stays text and unsafe links are dropped. Edits made while it streams, a collaborator's among them, move its target with them; if its text was deleted meanwhile, Accept puts the answer where the text was and says so, and if its block was deleted the stream stops and Accept puts the answer as blocks of their own beside the block that was next to it. `selection` and `context` are plain markdown: the spaces the engine keeps as `&#32;` reach the host as spaces. Stop aborts the signal and keeps what streamed. A stream that rejects, throws or yields something other than a string goes to `onError` and shows inline with Retry, as the next section explains. A new request, Discard and unmounting the canvas abort the signal too. A read-only canvas shows no AI entry points, and making a canvas read-only ends any answer it shows. Strings come from `AiLabels` (English in `englishAiLabels`), overridden through `aiExtension({ labels })`.

## Your own actions

The built-in actions are the same in every application. To offer one of yours by name, such as Rewrite as a release note or Check against our style guide, pass `actions` beside `stream`. Each is an `AiActionDefinition`: an `id`, the `label` the menus show, and the `prompt` to send, either the words themselves or a function that returns them, called with the rest of the request when the writer chooses the action. The AI menu lists your actions after its own, in a group headed More actions, and filters them with its own as the writer types. They are listed on an empty line too, where `selection` is empty, so word them for that or have the prompt say what to do with nothing.

Your stream receives an action of yours as a `custom` request, with the action's prompt as `prompt` and its `id` as `actionId`. A stream that reads `prompt` alone needs no change; one that keeps a system prompt or a model per action can switch on `actionId`. As with a request the writer types, the answer replaces the selected text, or goes below the block the caret is in when nothing is selected. Retry asks the same again, and a follow-up is the writer's own request, so it carries no `actionId`. A prompt function that throws asks nothing, and what it threw goes to the canvas's `onError`.

```ts
import { aiExtension, type AiActionDefinition, type AiStream } from 'quoin-editor/ai';
import { frAiLabels } from 'quoin-editor/locale-fr';

const stream: AiStream = async function* (request, signal) {
  const response = await fetch('/api/ai', { method: 'POST', body: JSON.stringify(request), signal });
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  for (let next = await reader.read(); !next.done; next = await reader.read()) yield next.value;
};

// Your application words and translates its own actions, as it does the rest of its interface.
const words = {
  en: { releaseNote: 'Rewrite as a release note', styleGuide: 'Check against our style guide' },
  fr: { releaseNote: 'Réécrire en note de version', styleGuide: 'Vérifier selon notre guide de style' },
};

export function assistant(locale: 'en' | 'fr') {
  const actions: AiActionDefinition[] = [
    {
      id: 'release-note',
      label: words[locale].releaseNote,
      prompt: 'Rewrite this as one line of a release note: past tense, for users, with no internal names.',
      places: ['aiMenu', 'bubbleToolbar'],
    },
    {
      id: 'style-guide',
      label: words[locale].styleGuide,
      prompt: (request) => `Check this against our style guide, and answer in ${request.language ?? 'English'}.`,
    },
  ];
  return aiExtension({ stream, actions, labels: locale === 'fr' ? frAiLabels : undefined });
}
```

An action goes in the AI menu alone unless its `places` say otherwise: `aiMenu`, `slashMenu` for an entry in the slash menu's AI group, which asks about the block the caret is in, `bubbleToolbar` for a button of the formatting toolbar, which asks about the selected text, and `blockMenu` for an entry of the block menu, which asks about the blocks it was opened on. Those three draw the action's `icon` beside its label, Sparkles when it has none; the AI menu lists names alone, as it does its own.

**Labels are yours to translate.** The editor's own strings come from `AiLabels` and the locale packs, but it cannot translate yours: it shows each `label` as you give it. Word it in the writer's language, and when the language changes, build the extension again with the new words and remount the canvas with a new `key`, since the canvas reads its extensions when it mounts. The heading over your actions is the editor's, `labels.moreActions`, which every locale pack translates and which you can override like any other label.

An `id` is unique among your actions and is not one of the built-in `AiAction` names, such as `improve` or `custom`. An action whose `id` is taken, by a built-in action or by an earlier one of yours, is left out of every menu, and a development build says so in the console. The actions are a list you hand over and nothing more: the editor does not load, store or discover them.

## When a request fails

The bar under a failed answer says `labels.failed` and offers Retry and Discard, and what the stream threw or rejected with goes to the canvas's `onError`. The error's own text stays out of the bar, since an unexpected one can hold details meant for you rather than the writer. To show a reason written for the writer, such as a missing key, a used-up quota or an unknown model, pass `describeError`: it is given what the stream threw or rejected with and returns the text to show under the label, announced with it, or `undefined` for the label alone. When `isRetryable` returns false for an error, asking again cannot help, and the bar offers Discard alone, with focus on it. A throw from either falls back to the label and to Retry, and `onError` hears every failure either way.

```ts
import { aiExtension, type AiStream } from 'quoin-editor/ai';

// What your server answered when it could not relay the request, said for the writer.
class AiRouteError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

const stream: AiStream = async function* (request, signal) {
  const response = await fetch('/api/ai', { method: 'POST', body: JSON.stringify(request), signal });
  if (!response.ok) throw new AiRouteError(await response.text(), response.status === 429);
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  for (let next = await reader.read(); !next.done; next = await reader.read()) yield next.value;
};

export const ai = aiExtension({
  stream,
  describeError: (error) => (error instanceof AiRouteError ? error.message : undefined),
  isRetryable: (error) => !(error instanceof AiRouteError) || error.retryable,
});
```
