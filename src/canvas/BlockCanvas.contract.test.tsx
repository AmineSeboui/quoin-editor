import { StrictMode, startTransition, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';

type Apply = (next: QuoinBlock[], setBlocks: (blocks: QuoinBlock[]) => void) => void;

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const markdownOf = (blocks: QuoinBlock[] | undefined) => blocks?.map((block) => block.data.markdown);
const paragraphs = () => screen.getAllByRole('textbox', { name: 'Paragraph' });

function caretAtEnd(host: HTMLElement): void {
  act(() => host.focus());
  const selection = document.getSelection()!;
  selection.selectAllChildren(host);
  selection.collapseToEnd();
}

/**
 * The caret inside the line rather than at its end. A document the host hands back replaces the one being typed in,
 * and the caret with it; at the end of the line that is where the caret already was, so the characters still land in
 * order and the test passes whatever the echo did. Only a caret with text after it shows the difference.
 */
function caretAfter(host: HTMLElement, prefix: string): void {
  act(() => host.focus());
  const range = document.createRange();
  range.setStart(host.firstChild!, prefix.length);
  range.collapse(true);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function mountHost(apply: Apply, initial: QuoinBlock[] = [md('a', '')]) {
  const onChange = vi.fn<(blocks: QuoinBlock[]) => void>();
  function Host() {
    const [blocks, setBlocks] = useState(initial);
    return (
      <BlockCanvas
        blocks={blocks}
        onChange={(next) => {
          onChange(next);
          apply(next, setBlocks);
        }}
      />
    );
  }
  render(<Host />);
  return { lastReported: () => markdownOf(onChange.mock.lastCall?.[0]) };
}

afterEach(() => vi.useRealTimers());

describe('BlockCanvas as a controlled component', () => {
  it('keeps every character typed while the host echoes onChange synchronously', () => {
    const { lastReported } = mountHost((next, setBlocks) => setBlocks(next), [md('a', 'hello world')]);
    caretAfter(paragraphs()[0], 'hello ');
    type('big ');
    expect(lastReported()).toEqual(['hello big world']);
    expect(paragraphs()[0]).toHaveTextContent(/^hello big world$/);
  });

  // This one documents a supported host pattern rather than guarding a failure of its own: React flushes the
  // transition before the next key is handled, so the document the host sets is never older than the one on screen
  // and the canvas has nothing to reconcile. A stale document reaching the canvas is covered by the debounced host
  // below, and at the engine's own layer by controlled-contract.lagging-copy.test.ts.
  it('keeps every character typed while the host applies onChange in a transition', () => {
    const { lastReported } = mountHost(
      (next, setBlocks) => startTransition(() => setBlocks(next)),
      [md('a', 'hello world')],
    );
    caretAfter(paragraphs()[0], 'hello ');
    type('big ');
    expect(lastReported()).toEqual(['hello big world']);
    expect(paragraphs()[0]).toHaveTextContent(/^hello big world$/);
  });

  // A host that lags rather than echoes: it applies the document it first saw, after more keys have landed. Echoing
  // the current document cannot disturb the canvas whenever it arrives, so a test that does only that says nothing
  // the synchronous one has not already said.
  it('keeps the newer text when a host debounces by 50 ms and applies the document it first saw', () => {
    vi.useFakeTimers();
    let stale: QuoinBlock[] | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { lastReported } = mountHost((next, setBlocks) => {
      stale ??= next;
      if (timer === undefined) timer = setTimeout(() => setBlocks(stale!), 50);
    }, [md('a', 'hello world')]);
    caretAfter(paragraphs()[0], 'hello ');
    type('bi');
    act(() => vi.advanceTimersByTime(50));
    type('g ');
    act(() => vi.advanceTimersByTime(50));
    expect(lastReported()).toEqual(['hello big world']);
    expect(paragraphs()[0]).toHaveTextContent(/^hello big world$/);
  });

  it('ignores a structural copy of the array it was last handed', () => {
    const onChange = vi.fn();
    const initial = [md('a', 'one')];
    const { rerender } = render(<BlockCanvas blocks={initial} onChange={onChange} />);
    caretAtEnd(paragraphs()[0]);
    type('!');
    rerender(<BlockCanvas blocks={structuredClone(initial)} onChange={onChange} />);
    expect(paragraphs()[0]).toHaveTextContent(/^one!$/);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('replaces the document with a new array of different content, and the next edit builds on it', () => {
    const onChange = vi.fn<(blocks: QuoinBlock[]) => void>();
    const { rerender } = render(<BlockCanvas blocks={[md('a', 'one')]} onChange={onChange} />);
    rerender(<BlockCanvas blocks={[md('x', 'loaded')]} onChange={onChange} />);
    expect(paragraphs().map((host) => host.textContent)).toEqual(['loaded']);
    caretAtEnd(paragraphs()[0]);
    type('!');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(markdownOf(onChange.mock.lastCall?.[0])).toEqual(['loaded!']);
  });

  it('resets to the supplied document when the host remounts it with a new key', () => {
    const blocks = [md('a', 'one')];
    const { rerender } = render(<BlockCanvas key="first" blocks={blocks} onChange={() => {}} />);
    caretAtEnd(paragraphs()[0]);
    type('!');
    expect(paragraphs()[0]).toHaveTextContent(/^one!$/);
    rerender(<BlockCanvas key="second" blocks={blocks} onChange={() => {}} />);
    expect(paragraphs()[0]).toHaveTextContent(/^one$/);
  });

  it('reports nothing on mount, not even for a 0.4 markdown block it splits into paragraphs', () => {
    const onChange = vi.fn();
    render(
      <StrictMode>
        <BlockCanvas blocks={[md('h', '# Title'), md('m', 'first\n\nsecond')]} onChange={onChange} />
      </StrictMode>,
    );
    expect(screen.getByRole('textbox', { name: 'Heading 1' })).toHaveTextContent('Title');
    expect(paragraphs().map((host) => host.textContent)).toEqual(['first', 'second']);
    expect(onChange).not.toHaveBeenCalled();
  });
});
