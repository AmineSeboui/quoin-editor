import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { BlockCanvas } from '../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../canvas/canvas-props';
import type { QuoinBlock } from '../types';
import { ownsNode, watchCanvasFocus } from './canvas-focus';
import { menuShown, portalledMenu } from './test-support/portalled-menu';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

function setup() {
  const one = createRef<QuoinEditorHandle>();
  const two = createRef<QuoinEditorHandle>();
  render(
    <>
      <BlockCanvas ref={one} blocks={[md('a', 'one')]} onChange={() => {}} extensions={[portalledMenu('Mine')]} />
      <BlockCanvas ref={two} blocks={[md('b', 'two')]} onChange={() => {}} extensions={[portalledMenu('Theirs')]} />
      <button type="button" className="quoin">
        Page
      </button>
    </>,
  );
  const controller = one.current!.controller;
  const heard: boolean[] = [];
  const stop = watchCanvasFocus(controller, document, (inside) => heard.push(inside));
  const button = (name: string) => screen.getByRole('button', { name });
  return { controller, other: two.current!.controller, heard, stop, button };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('focus that belongs to a canvas', () => {
  it("is in its root or in a portal of its own, never in another canvas's portal or the page's .quoin content", () => {
    const { controller, other, heard, button } = setup();
    act(() => controller.focus());
    act(() => button('Mine').focus());
    act(() => button('Theirs').focus());
    act(() => button('Page').focus());
    expect(heard).toEqual([true, true, false, false]);
    expect(ownsNode(controller, button('Mine'))).toBe(true);
    expect(ownsNode(other, button('Mine'))).toBe(false);
    expect(ownsNode(other, button('Theirs'))).toBe(true);
  });

  it('stays when it falls to the body from a portal of the canvas that closes', () => {
    const { heard, button } = setup();
    act(() => button('Mine').focus());
    act(() => {
      button('Mine').blur();
      menuShown.Mine(false);
    });
    act(() => void vi.runAllTimers());
    expect(heard).toEqual([true]);
  });

  it('leaves when it falls to the body from an element of the canvas that is still there, and stops when told', () => {
    const { controller, heard, stop, button } = setup();
    act(() => controller.focus());
    act(() => (document.activeElement as HTMLElement).blur());
    act(() => void vi.runAllTimers());
    expect(heard).toEqual([true, false]);
    stop();
    act(() => button('Mine').focus());
    expect(heard).toEqual([true, false]);
  });
});
