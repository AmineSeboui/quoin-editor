import { act, cleanup, screen } from '@testing-library/react';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import { statsExtension, type StatsOptions } from './stats-extension';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

function frames() {
  const queued = new Map<number, FrameRequestCallback>();
  let next = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    queued.set(++next, callback);
    return next;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => void queued.delete(id));
  const run = () =>
    act(() => {
      const due = [...queued.values()];
      queued.clear();
      for (const callback of due) callback(0);
    });
  return { run };
}

function mountStats(blocks: QuoinBlock[], options: StatsOptions = {}, readOnly = false) {
  const mounted = mountTypingCanvas(blocks, { extensions: [statsExtension(options)], readOnly });
  const footer = () => mounted.container.querySelector<HTMLElement>('[data-quoin-stats]');
  const parts = () => Array.from(footer()?.children ?? [], (part) => part.textContent);
  return { ...mounted, footer, parts };
}

afterEach(() => vi.restoreAllMocks());

describe('the stats footer', () => {
  it('shows the counts, and updates them once a frame however many edits it holds', () => {
    const { run } = frames();
    const { parts, caret, type, handle } = mountStats([md('a', 'One two'), md('b', 'three')]);
    expect(parts()).toEqual(['3 words', '12 characters', '2 blocks']);
    const counted = vi.spyOn(handle().editor, 'stats');
    caret('b', 5);
    type(' four');
    expect(counted).not.toHaveBeenCalled();
    expect(parts()).toEqual(['3 words', '12 characters', '2 blocks']);
    run();
    expect(counted).toHaveBeenCalledTimes(1);
    expect(parts()).toEqual(['4 words', '17 characters', '2 blocks']);
  });

  it('cancels a pending count when the canvas goes away', () => {
    const { run } = frames();
    const { caret, type, handle } = mountStats([md('a', 'One')]);
    const counted = vi.spyOn(handle().editor, 'stats');
    caret('a', 3);
    type('!');
    cleanup();
    run();
    expect(counted).not.toHaveBeenCalled();
  });

  it('is left out when the footer is off, and is not focusable', () => {
    expect(mountStats([md('a', 'One')], { footer: false }).footer()).toBeNull();
    const { footer } = mountStats([md('a', 'One')]);
    expect(footer()!.querySelector('[tabindex]')).toBeNull();
    expect(footer()!.hasAttribute('tabindex')).toBe(false);
  });

  it('speaks with the labels the host gives', () => {
    const labels = { words: (count: number) => `${count} mots` };
    expect(mountStats([md('a', 'Un deux')], { labels }).parts()[0]).toBe('2 mots');
  });
});

describe('a character limit', () => {
  it('shows the count against the limit, as a live region only from 90 percent of it', () => {
    const { run } = frames();
    const { parts, footer, caret, type } = mountStats([md('a', 'abcdefgh')], { limit: 10 });
    const count = () => footer()!.children[1];
    expect(parts()[1]).toBe('8 / 10 characters');
    expect(count().getAttribute('aria-live')).toBeNull();
    caret('a', 8);
    type('i');
    run();
    expect(parts()[1]).toBe('9 / 10 characters');
    expect(count().getAttribute('aria-live')).toBe('polite');
  });

  it('refuses typing past it, keeps the line as the model has it, and says why once', () => {
    const { caret, type, host, handle } = mountStats([md('a', 'abcd')], { limit: 5 });
    caret('a', 4);
    type('efg');
    expect(handle().editor.getBlocks()[0].data.markdown).toBe('abcde');
    expect(host('a').textContent).toBe('abcde');
    expect(screen.getByRole('status')).toHaveTextContent('Character limit of 5 reached');
    const announce = vi.spyOn(handle().controller, 'announce');
    type('h');
    expect(announce).not.toHaveBeenCalled();
  });

  it('lets a deletion through at the limit', () => {
    const { caret, type, key, handle } = mountStats([md('a', 'abcde')], { limit: 5 });
    caret('a', 5);
    type('f');
    key('Backspace');
    expect(handle().editor.getBlocks()[0].data.markdown).toBe('abcd');
  });
});

describe('focus mode', () => {
  const dimmed = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-quoin-dimmed]'), (shell) => shell.getAttribute('data-block-id'));

  it('moves the dimmed attribute with the caret and hides nothing from assistive technology', () => {
    const { container, caret, handle } = mountStats([md('a', 'one'), md('b', 'two'), md('c', 'three')], {
      focusMode: true,
    });
    caret('b', 0);
    expect(dimmed(container)).toEqual(['a', 'c']);
    caret('c', 1);
    expect(dimmed(container)).toEqual(['a', 'b']);
    expect(handle().controller.root!.hasAttribute('data-quoin-focus-mode')).toBe(true);
    expect(container.querySelector('[aria-hidden="true"][data-quoin-block], [inert]')).toBeNull();
  });

  it('is off while the canvas is read-only, and by default', () => {
    const readOnly = mountStats([md('a', 'one')], { focusMode: true }, true);
    expect(readOnly.handle().controller.root!.hasAttribute('data-quoin-focus-mode')).toBe(false);
    cleanup();
    const plain = mountStats([md('a', 'one'), md('b', 'two')]);
    plain.caret('a', 0);
    expect(dimmed(plain.container)).toEqual([]);
    expect(plain.handle().controller.root!.hasAttribute('data-quoin-focus-mode')).toBe(false);
  });
});

describe('typography', () => {
  it('turns typed forms into typographic ones when asked, and leaves them otherwise', () => {
    const on = mountStats([md('a', '')], { typography: true, footer: false });
    on.caret('a', 0);
    on.type('...');
    expect(on.handle().editor.getBlocks()[0].data.markdown).toBe('\u2026');
    cleanup();
    const off = mountStats([md('a', '')], { footer: false });
    off.caret('a', 0);
    off.type('...');
    expect(off.handle().editor.getBlocks()[0].data.markdown).toBe('...');
  });

  it('takes the dash it is given', () => {
    const { caret, type, handle } = mountStats([md('a', '')], { typography: { dashes: 'em' }, footer: false });
    caret('a', 0);
    type('a--');
    expect(handle().editor.getBlocks()[0].data.markdown).toBe('a\u2014');
  });
});
