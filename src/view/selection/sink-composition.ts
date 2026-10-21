import type { ViewController } from '../controller/view-controller';
import { clearSink, wholeBlocks } from './selection-sink';

export type SinkComposition = { start(): void; end(): void; release(): void };

type Outside = { readonly before: string; readonly after: string };

const SINK_KEY = 'sink';

function textBetween(sink: HTMLElement, start: Node, startOffset: number, end: Node, endOffset: number): string {
  const range = sink.ownerDocument.createRange();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  return range.toString();
}

function textOutsideSelection(sink: HTMLElement): Outside {
  const selection = sink.ownerDocument.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  if (range === null || !sink.contains(range.startContainer) || !sink.contains(range.endContainer)) {
    return { before: '', after: '' };
  }
  return {
    before: textBetween(sink, sink, 0, range.startContainer, range.startOffset),
    after: textBetween(sink, range.endContainer, range.endOffset, sink, sink.childNodes.length),
  };
}

function composedText(sink: HTMLElement, { before, after }: Outside): string {
  let text = sink.textContent ?? '';
  if (text.startsWith(before)) text = text.slice(before.length);
  return text.endsWith(after) ? text.slice(0, text.length - after.length) : text;
}

// Korean IMEs end one syllable and start the next at once, so the sink stays the target until no composition follows,
// and some browsers apply the committed text in an input event after compositionend, so the sink is read once that
// event has run, or after a zero delay timeout when none comes. Keys such as Home move the sink's caret without
// changing the model, so only the text that lay inside the sink's selection when the first composition started is
// replaced.
export function createSinkComposition(controller: ViewController): SinkComposition {
  let outside: Outside | null = null;
  let stopWaiting: (() => void) | null = null;

  function settle(): void {
    stopWaiting?.();
    stopWaiting = null;
    const { sink } = controller;
    const ignored = wholeBlocks(controller.editor.state.selection);
    const text = sink !== null && outside !== null && !ignored ? composedText(sink, outside) : '';
    outside = null;
    controller.composingKey = null;
    clearSink(controller);
    if (text === '') controller.syncSelectionToDom();
    else controller.edit(() => controller.editor.insertText(text));
  }

  return {
    start() {
      stopWaiting?.();
      stopWaiting = null;
      if (outside === null && controller.sink !== null) outside = textOutsideSelection(controller.sink);
      controller.composingKey = SINK_KEY;
    },
    end() {
      const { sink } = controller;
      if (outside === null || stopWaiting !== null || sink === null) return;
      const onInput = (event: Event) => {
        if (!(event as InputEvent).isComposing) settle();
      };
      const timer = setTimeout(settle, 0);
      sink.addEventListener('input', onInput);
      stopWaiting = () => {
        clearTimeout(timer);
        sink.removeEventListener('input', onInput);
      };
    },
    release() {
      if (stopWaiting !== null) settle();
      else if (outside !== null) {
        outside = null;
        controller.composingKey = null;
      }
    },
  };
}
