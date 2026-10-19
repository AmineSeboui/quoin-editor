import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountCanvas, paragraph, testBlockTypes } from '../blocks/void/test-canvas';
import { blockRangeSelection, textSelection } from '../engine';
import { defineBlock } from '../registry';
import { md } from '../view/react/test-harness';

const ROW = 30;
const LEFT = 48;

// jsdom lays nothing out, so every block shell is given a row of its own, 24 px tall, in document order.
function layOutRows(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shells = [...document.querySelectorAll<HTMLElement>('[data-block-id]')];
    const row = shells.indexOf(this);
    const [top, left, width, height] = row < 0 ? [0, 0, 600, 600] : [row * ROW, LEFT, 552, ROW - 6];
    return { top, left, width, height, x: left, y: top, right: left + width, bottom: top + height } as DOMRect;
  });
}

const hostOf = (shell: HTMLElement) => shell.querySelector<HTMLElement>('[data-quoin-host]')!;
const handleButton = () => screen.getByRole('button', { name: 'Drag to move, click for options' });
const ghost = () => document.querySelector<HTMLElement>('[data-quoin-drag-ghost]')!;
const dropLine = () => document.querySelector<HTMLElement>('[data-quoin-drop-line]')!;

const fire = (target: EventTarget, type: string, init: MouseEventInit) =>
  act(() => void target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init })));

function press(x: number, y: number): void {
  fire(handleButton(), 'pointerdown', { button: 0, buttons: 1, clientX: x, clientY: y });
}

const moveTo = (x: number, y: number) => fire(document, 'pointermove', { buttons: 1, clientX: x, clientY: y });

function release(x: number, y: number): void {
  fire(handleButton(), 'pointerup', { button: 0, clientX: x, clientY: y });
  fire(handleButton(), 'click', { button: 0, detail: 1, clientX: x, clientY: y });
}

function mountRows(...args: Parameters<typeof mountCanvas>) {
  const mounted = mountCanvas(...args);
  const hover = (id: string) => fireEvent.pointerMove(hostOf(mounted.shell(id)));
  const ids = () => mounted.handle().editor.getBlocks().map((block) => block.id);
  return { ...mounted, hover, ids };
}

beforeEach(layOutRows);

afterEach(() => vi.restoreAllMocks());

describe('dragging a block by its handle', () => {
  it('moves it to the gap nearest the pointer, says where it went once and opens no menu', () => {
    const { handle, hover, ids } = mountRows([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    const said = vi.fn();
    handle().controller.announcer.subscribe(said);
    hover('a');
    press(20, 10);
    moveTo(20, 16);
    moveTo(20, 90);
    release(20, 90);
    expect(ids()).toEqual(['b', 'c', 'a']);
    expect(screen.getByRole('status')).toHaveTextContent('Block moved to position 3 of 3');
    expect(said).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays a click that opens the block menu when the press moves less than 4 px', () => {
    const { hover, ids } = mountRows([paragraph('a', 'one'), paragraph('b', 'two')]);
    hover('a');
    press(20, 10);
    moveTo(22, 12);
    release(22, 12);
    expect(ids()).toEqual(['a', 'b']);
    expect(screen.getByRole('menu')).toHaveAccessibleName('Text block menu');
  });

  it('nests the block under the one above when the pointer moves right by two indent steps', () => {
    const { hover, last } = mountRows([paragraph('a', 'one'), paragraph('l', '- item'), paragraph('d', 'Delta')]);
    hover('d');
    press(20, 70);
    moveTo(68, 70);
    release(68, 70);
    expect(last()).toEqual([paragraph('a', 'one'), paragraph('l', '- item'), { ...paragraph('d', 'Delta'), indent: 1 }]);
    expect(screen.getByRole('status')).toHaveTextContent('Block moved to position 3 of 3');
  });

  it('nests the block under the one above when the pointer moves left by two indent steps on right-to-left lines', () => {
    const { handle, hover, last } = mountRows([paragraph('a', 'one'), paragraph('l', '- item'), paragraph('d', 'Delta')]);
    handle().controller.root!.style.direction = 'rtl';
    hover('d');
    press(580, 70);
    moveTo(532, 70);
    expect([dropLine().style.left, dropLine().style.width]).toEqual(['48px', '528px']);
    release(532, 70);
    expect(last()).toEqual([paragraph('a', 'one'), paragraph('l', '- item'), { ...paragraph('d', 'Delta'), indent: 1 }]);
  });

  it('takes the nested blocks along', () => {
    const { hover, ids } = mountRows([md('a', '- parent'), md('c', '- child', 1), md('z', 'after')]);
    hover('a');
    press(20, 10);
    moveTo(20, 100);
    release(20, 100);
    expect(ids()).toEqual(['z', 'a', 'c']);
  });

  it('moves every selected block when one of them is dragged', () => {
    const { handle, hover, ids } = mountRows([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    act(() => handle().controller.dispatch(handle().editor.createTransaction().setSelection(blockRangeSelection('a', 'b'))));
    hover('b');
    press(20, 40);
    moveTo(20, 100);
    release(20, 100);
    expect(ids()).toEqual(['c', 'a', 'b']);
    expect(handle().editor.state.selection).toEqual(blockRangeSelection('a', 'b'));
  });

  it('drops below the blocks a closed toggle hides rather than between the toggle and them', () => {
    const toggle = { id: 't', type: 'TOGGLE', data: { markdown: 'Details', open: false } };
    const { hover, ids } = mountRows([toggle, md('h', 'hidden', 1), paragraph('x', 'x'), paragraph('y', 'y')]);
    hover('y');
    press(20, 70);
    moveTo(20, 27);
    release(20, 27);
    expect(ids()).toEqual(['t', 'h', 'y', 'x']);
    expect(screen.getByRole('status')).toHaveTextContent('Block moved to position 2 of 3');
  });

  it('keeps the gutter beside the dragged block while the pointer crosses others', () => {
    const { hover } = mountRows([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    hover('a');
    press(20, 10);
    moveTo(20, 50);
    hover('c');
    expect(handleButton().closest('[data-quoin-gutter-block]')).toHaveAttribute('data-quoin-gutter-block', 'a');
    release(20, 50);
  });

  it('leaves a click with no pointer behind it to open the menu, even right after a drag', () => {
    const { hover, ids } = mountRows([paragraph('a', 'one'), paragraph('b', 'two')]);
    hover('a');
    press(20, 10);
    moveTo(20, 60);
    fire(document, 'pointerup', { button: 0, clientX: 20, clientY: 60 });
    expect(ids()).toEqual(['b', 'a']);
    fire(handleButton(), 'click', { detail: 0 });
    expect(screen.getByRole('menu')).toHaveAccessibleName('Text block menu');
  });

  it('draws no block again while the pointer drags across them', () => {
    let drawn = 0;
    const counted = defineBlock<{ n: number }>({
      type: 'COUNTED',
      label: 'Counted',
      icon: () => null,
      preview: () => {
        drawn += 1;
        return <p>counted</p>;
      },
    });
    const doc = [paragraph('a', 'one'), { id: 'k', type: 'COUNTED', data: { n: 1 } }, paragraph('b', 'two')];
    const { hover } = mountRows(doc, { blockTypes: [...testBlockTypes, counted] });
    hover('a');
    const before = drawn;
    press(20, 10);
    for (const y of [20, 40, 60, 80, 60, 40]) moveTo(20 + y / 2, y);
    expect(drawn).toBe(before);
    release(20, 40);
  });

  it('is cancelled by Escape, leaving the order and the selection as they were', () => {
    const { handle, hover, ids, selection } = mountRows([paragraph('a', 'one'), paragraph('b', 'two')]);
    act(() => handle().focus({ block: 'b', region: 'text', offset: 1 }));
    hover('a');
    press(20, 10);
    moveTo(20, 60);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => void hostOf(handle().controller.blockElement('b')!).dispatchEvent(escape));
    expect(escape.defaultPrevented).toBe(true);
    expect(ghost()).not.toBeVisible();
    release(20, 60);
    expect(ids()).toEqual(['a', 'b']);
    expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 1 }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows a copy of the dragged block under the pointer and a line at the drop, without selecting anything', () => {
    const { handle, hover, selection } = mountRows([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    act(() => handle().focus({ block: 'c', region: 'text', offset: 2 }));
    hover('a');
    press(20, 10);
    moveTo(20, 50);
    expect(ghost()).toBeVisible();
    expect(ghost()).toHaveTextContent('one');
    expect(ghost()).toHaveAttribute('aria-hidden', 'true');
    expect(ghost().querySelector('[data-block-id], [contenteditable], [id]')).toBeNull();
    expect(dropLine()).toBeVisible();
    expect(dropLine().style.top).toBe('56px');
    expect(selection()).toEqual(textSelection({ block: 'c', region: 'text', offset: 2 }));
    expect(handle().controller.root).not.toHaveAttribute('data-quoin-dragging');
    release(20, 50);
    expect(ghost()).not.toBeVisible();
    expect(ghost()).toBeEmptyDOMElement();
    expect(dropLine()).not.toBeVisible();
  });

  it('scrolls the window while the pointer is near its bottom edge, and stops on release', async () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { hover } = mountRows([paragraph('a', 'one'), paragraph('b', 'two')]);
    hover('a');
    press(20, 10);
    moveTo(20, window.innerHeight - 5);
    await waitFor(() => expect(scrollBy).toHaveBeenCalled());
    expect(scrollBy.mock.calls[0][1]).toBeGreaterThan(0);
    release(20, window.innerHeight - 5);
    const calls = scrollBy.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scrollBy).toHaveBeenCalledTimes(calls);
  });

  it('removes every listener it added when the canvas unmounts mid-drag', () => {
    const spies = [document, window].map((target) => ({
      added: vi.spyOn(target, 'addEventListener'),
      removed: vi.spyOn(target, 'removeEventListener'),
    }));
    const { hover } = mountRows([paragraph('a', 'one'), paragraph('b', 'two')]);
    hover('a');
    press(20, 10);
    moveTo(20, 60);
    cleanup();
    const watched = ['pointermove', 'pointerup', 'pointercancel', 'keydown', 'blur'];
    const kept = spies.flatMap(({ added, removed }) =>
      added.mock.calls.filter(
        ([type, listener]) =>
          watched.includes(type) && !removed.mock.calls.some(([gone, was]) => gone === type && was === listener),
      ),
    );
    expect(spies[0].added).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(kept.map(([type]) => type)).toEqual([]);
  });
});
