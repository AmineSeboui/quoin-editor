import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { textSelection } from '../../engine';
import { at, cleanUpAfterTest, mountController } from '../../view/controller/test-controller';
import { BUBBLE_PART, bubblePart } from './bubble-part';
import { useBubbleVisibility } from './use-bubble-visibility';

type Mounted = ReturnType<typeof setup>;

function setup() {
  const mounted = mountController('hello world');
  const { controller, editor } = mounted;
  act(() => controller.focus('start'));
  const { result } = renderHook(() => useBubbleVisibility(controller));
  const select = (from: number, to: number) =>
    act(() => controller.dispatch(editor.createTransaction().setSelection(textSelection(at(from), at(to)))));
  return { ...mounted, select, visible: () => result.current };
}

function stubPointer(fine: boolean): void {
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: media === '(pointer: fine)' ? fine : !fine,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  cleanup();
  cleanUpAfterTest();
  vi.unstubAllGlobals();
});

describe('useBubbleVisibility', () => {
  it.each<[string, boolean, (mounted: Mounted) => void]>([
    ['a collapsed caret', false, ({ select }) => select(3, 3)],
    ['a range of text', true, ({ select }) => select(0, 5)],
    [
      'a range while a pointer button is down',
      false,
      ({ select, host }) => {
        select(0, 5);
        act(() => void fireEvent.pointerDown(host));
      },
    ],
    [
      'a range while a composition runs',
      false,
      ({ select, host }) => {
        select(0, 5);
        act(() => void fireEvent.compositionStart(host));
      },
    ],
  ])('for %s is %s', (_, expected, arrange) => {
    const mounted = setup();
    arrange(mounted);
    expect(mounted.visible()).toBe(expected);
  });

  it('is hidden for a range under a coarse pointer, where the mobile toolbar formats instead', () => {
    stubPointer(false);
    const { select, visible } = setup();
    select(0, 5);
    expect(visible()).toBe(false);
  });

  it('shows on a fine pointer', () => {
    stubPointer(true);
    const { select, visible } = setup();
    select(0, 5);
    expect(visible()).toBe(true);
  });

  it('shows once the pointer that made the range comes up', () => {
    const { select, host, visible } = setup();
    act(() => void fireEvent.pointerDown(host));
    select(0, 5);
    expect(visible()).toBe(false);
    act(() => void fireEvent.pointerUp(document.body));
    expect(visible()).toBe(true);
  });

  it('ignores a press outside the editor, such as on the toolbar', () => {
    const { select, visible } = setup();
    select(0, 5);
    act(() => void fireEvent.pointerDown(document.body));
    expect(visible()).toBe(true);
  });

  it('follows focus: hidden once it leaves the editor, kept while it is on a part of its own toolbar', () => {
    const { controller, select, visible } = setup();
    select(0, 5);
    const outside = document.body.appendChild(document.createElement('button'));
    act(() => outside.focus());
    expect(visible()).toBe(false);
    const otherPart = document.body.appendChild(document.createElement('div'));
    otherPart.setAttribute(BUBBLE_PART, 'another editor');
    act(() => otherPart.appendChild(document.createElement('button')).focus());
    expect(visible()).toBe(false);
    const part = document.body.appendChild(document.createElement('div'));
    part.setAttribute(BUBBLE_PART, bubblePart(controller)[BUBBLE_PART]);
    act(() => part.appendChild(document.createElement('button')).focus());
    expect(visible()).toBe(true);
  });

  it('is hidden in a read-only editor', () => {
    const { controller, select, visible } = setup();
    select(0, 5);
    act(() => controller.setReadOnly(true));
    expect(visible()).toBe(false);
  });
});
