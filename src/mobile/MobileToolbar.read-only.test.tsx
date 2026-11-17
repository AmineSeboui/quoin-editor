import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { mountCanvas, paragraph } from '../blocks/test-support/test-canvas';
import { BlockCanvas } from '../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../canvas/canvas-props';
import { defineExtension, textSelection, type Pos } from '../engine';
import type { ToolbarItem } from '../extensions/ui-types';
import { Sparkles } from '../icons';

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const queryToolbar = () => screen.queryByRole('toolbar', { name: 'Editing tools' });
const names = () =>
  within(queryToolbar()!)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);

const item = (id: string, extra: Partial<ToolbarItem> = {}): ToolbarItem => ({
  id,
  title: id,
  icon: Sparkles,
  run: () => {},
  ...extra,
});

const extensionOf = (...items: ToolbarItem[]) => [defineExtension({ name: 'extra', ui: { bubbleItems: items } })];

function open(readOnly: boolean, items: ToolbarItem[], from = 0, to = 5) {
  const canvas = mountCanvas([paragraph('a', 'hello world')], { readOnly, extensions: extensionOf(...items) });
  act(() => {
    const { controller } = canvas.handle();
    controller.focus(pos(from));
    controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(from), pos(to))));
  });
  return canvas;
}

beforeEach(() =>
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: media === '(pointer: coarse)',
    addEventListener: () => {},
    removeEventListener: () => {},
  })),
);
afterEach(() => vi.unstubAllGlobals());

describe('the mobile toolbar on a read-only canvas', () => {
  it('shows only the items that work read-only, for a text selection', () => {
    const run = vi.fn();
    open(true, [item('Star', { whileReadOnly: true, run }), item('Moon')]);
    expect(names()).toEqual(['Star']);
    act(() => within(queryToolbar()!).getByRole('button', { name: 'Star' }).click());
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('takes focus from the text with Alt+F10, for a hardware keyboard', () => {
    const canvas = open(true, [item('Star', { whileReadOnly: true })]);
    const host = canvas.container.querySelector<HTMLElement>('[data-quoin-host]')!;
    act(() => void fireEvent.keyDown(host, { key: 'F10', altKey: true }));
    expect(within(queryToolbar()!).getByRole('button', { name: 'Star' })).toHaveFocus();
  });

  it('shows no toolbar when no item works read-only', () => {
    open(true, [item('Moon')]);
    expect(queryToolbar()).toBeNull();
  });

  it('shows no toolbar when the read-only item is unavailable', () => {
    open(true, [item('Star', { whileReadOnly: true, available: () => false })]);
    expect(queryToolbar()).toBeNull();
  });

  it('shows no toolbar at a caret', () => {
    open(true, [item('Star', { whileReadOnly: true })], 3, 3);
    expect(queryToolbar()).toBeNull();
  });

  it('keeps the tools of an editable canvas as they are, whatever works read-only', () => {
    open(false, [item('Star', { whileReadOnly: true }), item('Moon')]);
    expect(names()).toEqual([
      'Add block below',
      'Turn into',
      'Bold',
      'Italic',
      'Strikethrough',
      'Code',
      'Link',
      'Indent',
      'Outdent',
      'Undo',
      'Redo',
    ]);
  });

  it('turning read-only with focus on a tool gives focus back to the text and shows the read-only items', async () => {
    const ref = createRef<QuoinEditorHandle>();
    const blocks = [paragraph('a', 'hello world')];
    const extensions = extensionOf(item('Star', { whileReadOnly: true }));
    const draw = (readOnly: boolean) => (
      <BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} readOnly={readOnly} extensions={extensions} />
    );
    const { container, rerender } = render(draw(false));
    act(() => {
      const { controller } = ref.current!;
      controller.focus(pos(0));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(0), pos(5))));
    });
    act(() => within(queryToolbar()!).getByRole('button', { name: 'Bold' }).focus());
    rerender(draw(true));
    await act(async () => {});
    expect(document.activeElement).toBe(container.querySelector('[data-quoin-host]'));
    expect(names()).toEqual(['Star']);
  });
});
