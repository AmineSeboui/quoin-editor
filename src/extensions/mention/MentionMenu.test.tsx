import { StrictMode, useEffect, useRef, useState } from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import type { Extension } from '../../engine';
import { mentionExtension } from './mention-extension';
import type { MentionResult } from './mention-feature';
import { deferredSearch, mountMentions, waitForSearch } from './mention-test-canvas';

const ada: MentionResult = { id: '42', label: 'Ada' };
const SEARCHING = 'Searching\u2026';

const options = () => within(screen.getByRole('listbox', { name: 'Mentions' })).queryAllByRole('option');
const optionTexts = () => options().map((option) => option.textContent);

function openOn(markdown: string, canvasProps: Parameters<typeof mountMentions>[2] = {}) {
  const deferred = deferredSearch();
  const canvas = mountMentions([paragraph('p', markdown)], { search: deferred.search }, canvasProps);
  canvas.caret('p', markdown.length);
  return { ...deferred, canvas };
}

async function answered(results: readonly MentionResult[]) {
  const opened = openOn('Ask');
  opened.canvas.type(' @ad');
  waitForSearch();
  await opened.last().resolve(results);
  return opened;
}

describe('the mention menu', () => {
  beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => void vi.useRealTimers());

  it('asks the host search 120 ms after the last keystroke, for the last query only', () => {
    const { canvas, search, queries } = openOn('Ask');
    canvas.type(' @');
    waitForSearch(100);
    canvas.type('a');
    waitForSearch(100);
    canvas.type('d');
    waitForSearch(119);
    expect(search).not.toHaveBeenCalled();
    waitForSearch(1);
    expect(queries()).toEqual(['ad']);
  });

  it('says it is searching until the host answers, then lists what it found, the first one active', async () => {
    const { canvas, last } = openOn('Ask');
    canvas.type(' @ad');
    expect(canvas.menu()).not.toBeNull();
    expect(screen.getByText(SEARCHING)).toBeInTheDocument();
    waitForSearch();
    await last().resolve([ada, { id: '7', label: 'Adam', description: 'Gardener' }]);
    expect(screen.queryByText(SEARCHING)).toBeNull();
    expect(optionTexts()).toEqual(['Ada', 'AdamGardener']);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('drops an answer to a query typed past that comes while the one typed last is pending', async () => {
    const { canvas, asked } = openOn('Ask');
    canvas.type(' @ad');
    waitForSearch();
    canvas.type('a');
    waitForSearch();
    await asked[0].resolve([{ id: '2', label: 'Adam' }]);
    expect(optionTexts()).toEqual([]);
    expect(screen.getByText(SEARCHING)).toBeInTheDocument();
    await asked[1].resolve([{ id: '1', label: 'Ada Lovelace' }]);
    expect(optionTexts()).toEqual(['Ada Lovelace']);
  });

  it('drops an answer that comes after the one to the query typed last', async () => {
    const { canvas, asked } = openOn('Ask');
    canvas.type(' @ad');
    waitForSearch();
    canvas.type('a');
    waitForSearch();
    await asked[1].resolve([{ id: '1', label: 'Ada Lovelace' }]);
    await asked[0].resolve([{ id: '2', label: 'Adam' }]);
    expect(optionTexts()).toEqual(['Ada Lovelace']);
  });

  it('shows No matches for an empty answer and for a search that rejects or throws, reporting the failures', async () => {
    const onError = vi.fn();
    const search = vi.fn(async (query: string) => {
      if (query === 'b') throw new Error('offline');
      return [];
    });
    const throwing = vi.fn((query: string): Promise<readonly MentionResult[]> => {
      if (query === 'c') throw new Error('broken');
      return search(query);
    });
    const canvas = mountMentions([paragraph('p', '')], { search: throwing }, { onError });
    canvas.caret('p', 0);
    for (const query of ['a', 'b', 'c']) {
      canvas.type(`@${query}`);
      await act(async () => void (await vi.advanceTimersByTimeAsync(120)));
      expect(screen.getByText('No matches')).toBeInTheDocument();
      canvas.key('Escape');
      canvas.type(' ');
    }
    expect(onError.mock.calls).toEqual([[new Error('offline')], [new Error('broken')]]);
    expect(canvas.host('p')).toBeInTheDocument();
  });

  it('puts the chosen mention and a space in place of the @ and the query, which reads back as its markdown', async () => {
    const { canvas } = await answered([ada]);
    canvas.key('Enter');
    expect(canvas.menu()).toBeNull();
    expect(canvas.markdown('p')).toBe('Ask [@Ada](mention:42)&#32;');
    expect(canvas.selection()).toMatchObject({ head: { block: 'p', offset: 6 } });
    canvas.type('hi');
    expect(canvas.markdown('p')).toBe('Ask [@Ada](mention:42) hi');
  });

  it('brings the @ and the query back with one undo', async () => {
    const { canvas } = await answered([ada]);
    canvas.key('Enter');
    canvas.undo();
    expect(canvas.markdown('p')).toBe('Ask @ad');
  });

  it('chooses with Tab and the arrows too, writing the kind of the result into the mention', async () => {
    const { canvas } = await answered([ada, { id: '7', label: 'Adam', kind: 'user' }]);
    canvas.key('ArrowDown');
    canvas.key('Tab');
    expect(canvas.markdown('p')).toBe('Ask [@Adam](mention:user:7)&#32;');
  });

  it('closes on Escape and leaves the @ and the query as text', async () => {
    const { canvas } = await answered([ada]);
    canvas.key('Escape');
    expect(canvas.menu()).toBeNull();
    expect(canvas.markdown('p')).toBe('Ask @ad');
    canvas.type('a');
    expect(canvas.menu()).toBeNull();
  });

  it('closes on a space right after the @, and asks nothing for the words after it', () => {
    const { canvas, search } = openOn('Ask');
    canvas.type(' @ ');
    expect(canvas.menu()).toBeNull();
    canvas.type('and more');
    waitForSearch();
    expect(canvas.menu()).toBeNull();
    expect(search).not.toHaveBeenCalled();
    expect(canvas.markdown('p')).toBe('Ask @ and more');
  });

  it('closes on a space once the host has found nothing, and stays open on one after results', async () => {
    const { canvas, last, queries } = openOn('Ask');
    canvas.type(' @zz');
    waitForSearch();
    await last().resolve([]);
    canvas.type(' ');
    expect(canvas.menu()).toBeNull();
    canvas.type('top');
    waitForSearch();
    expect(queries()).toEqual(['zz']);
    expect(canvas.markdown('p')).toBe('Ask @zz top');

    canvas.type(' @ada');
    waitForSearch();
    await last().resolve([ada]);
    canvas.type(' ');
    expect(optionTexts()).toEqual(['Ada']);
  });

  it('asks nothing once the menu closes during the wait, or once the canvas is gone', () => {
    const { canvas, search } = openOn('Ask');
    canvas.type(' @ad');
    canvas.key('Escape');
    waitForSearch();
    canvas.type(' @ad');
    cleanup();
    waitForSearch();
    expect(search).not.toHaveBeenCalled();
  });

  it('reports no failure that comes once the canvas is gone', async () => {
    const onError = vi.fn();
    const { search, last } = deferredSearch();
    const canvas = mountMentions([paragraph('p', 'Ask')], { search }, { onError });
    canvas.caret('p', 3);
    canvas.type(' @ad');
    waitForSearch();
    cleanup();
    await last().reject(new Error('offline'));
    expect(onError).not.toHaveBeenCalled();
  });

  it('stays closed on a read-only canvas, and without a search', () => {
    const readOnly = openOn('Ask @ad', { readOnly: true });
    waitForSearch();
    expect(readOnly.canvas.menu()).toBeNull();
    expect(readOnly.search).not.toHaveBeenCalled();
    cleanup();

    const searchless = mountMentions([paragraph('p', 'Ask')]);
    searchless.caret('p', 3);
    searchless.type(' @ad');
    waitForSearch();
    expect(searchless.menu()).toBeNull();
    expect(searchless.markdown('p')).toBe('Ask @ad');
  });

  it('neither asks again nor loses its results when the host renders anew with a new search', async () => {
    const first = deferredSearch();
    const second = vi.fn(async () => [{ id: '9', label: 'Other' }]);
    let renderAgain = () => {};
    function Host() {
      const [count, setCount] = useState(0);
      renderAgain = () => setCount(count + 1);
      return <HostCanvas extensions={[mentionExtension({ search: count === 0 ? first.search : second })]} />;
    }
    render(<Host />);
    typeText('@ad');
    waitForSearch();
    await first.last().resolve([ada]);
    act(() => renderAgain());
    waitForSearch();
    expect(first.queries()).toEqual(['ad']);
    expect(second).not.toHaveBeenCalled();
    expect(optionTexts()).toEqual(['Ada']);
  });

  it('asks the host once under StrictMode', () => {
    const { search, queries } = deferredSearch();
    const extensions = [mentionExtension({ search })];
    render(
      <StrictMode>
        <HostCanvas extensions={extensions} />
      </StrictMode>,
    );
    typeText('@ad');
    waitForSearch();
    expect(queries()).toEqual(['ad']);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('draws each result as text, with an avatar only from an http or https address', async () => {
    await answered([
      { id: '1', label: '<b>Ada</b>', description: '<i>Mathematician</i>', avatarUrl: 'https://cdn.quoin.test/ada.png' },
      { id: '2', label: 'Bob', avatarUrl: 'javascript:alert(1)' },
      { id: '3', label: 'Cy', avatarUrl: 'data:image/png;base64,AAAA' },
    ]);
    const [first, second, third] = options();
    expect(first).toHaveTextContent('<b>Ada</b><i>Mathematician</i>');
    expect(first.querySelector('b, i')).toBeNull();
    expect(first.querySelector('img')).toHaveAttribute('src', 'https://cdn.quoin.test/ada.png');
    expect(first.querySelector('img')).toHaveAttribute('alt', '');
    expect(second.querySelector('img')).toBeNull();
    expect(third.querySelector('img')).toBeNull();
  });

  it('draws and inserts a result whose kind and description are not text, leaving them out', async () => {
    const junk = { id: '42', label: 'Ada', kind: 7, description: { text: 'Mathematician' } };
    const { canvas } = await answered([junk as unknown as MentionResult]);
    expect(optionTexts()).toEqual(['Ada']);
    canvas.key('Enter');
    expect(canvas.markdown('p')).toBe('Ask [@Ada](mention:42)&#32;');
  });

  it('has no accessibility violations while it searches, lists results and finds none', async () => {
    const { canvas, last } = openOn('Ask');
    const scan = async () => {
      await act(async () => {});
      vi.useRealTimers();
      expect(await axe(canvas.container)).toHaveNoViolations();
      expect(await axe(canvas.menu()!.parentElement!)).toHaveNoViolations();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    };
    canvas.type(' @ad');
    waitForSearch();
    expect(screen.getByText(SEARCHING)).toBeInTheDocument();
    await scan();
    await last().resolve([ada]);
    await scan();
    canvas.type('x');
    waitForSearch();
    await last().resolve([]);
    expect(screen.getByText('No matches')).toBeInTheDocument();
    await scan();
  });
});

// A canvas a test renders itself, with the caret in its empty paragraph once it mounts.
function HostCanvas({ extensions }: { extensions: Extension[] }) {
  const [blocks, setBlocks] = useState([paragraph('p', '')]);
  const ref = useRef<QuoinEditorHandle>(null);
  useEffect(() => ref.current?.focus({ block: 'p', region: 'text', offset: 0 }), []);
  return <BlockCanvas ref={ref} blocks={blocks} onChange={setBlocks} blockTypes={coreBlocks} extensions={extensions} />;
}

function typeText(text: string) {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    act(() => void document.activeElement!.dispatchEvent(event));
  }
}
