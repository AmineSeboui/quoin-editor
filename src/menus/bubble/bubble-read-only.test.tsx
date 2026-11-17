import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { mountCanvas, paragraph } from '../../blocks/test-support/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { defineExtension, textSelection, type Pos } from '../../engine';
import type { ToolbarItem } from '../../extensions/ui-types';
import { Sparkles } from '../../icons';

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });

const item = (id: string, extra: Partial<ToolbarItem> = {}): ToolbarItem => ({
  id,
  title: id,
  icon: Sparkles,
  run: () => {},
  ...extra,
});

const extensionOf = (...items: ToolbarItem[]) => [defineExtension({ name: 'extra', ui: { bubbleItems: items } })];

const names = () =>
  within(screen.getByRole('toolbar'))
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);

function selectText(handle: () => QuoinEditorHandle): void {
  act(() => {
    const { controller } = handle();
    controller.focus(pos(0));
    controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(0), pos(5))));
  });
}

function openReadOnly(...items: ToolbarItem[]) {
  const ref = createRef<QuoinEditorHandle>();
  const { container } = render(
    <BlockCanvas
      ref={ref}
      blocks={[paragraph('a', 'hello world')]}
      onChange={() => {}}
      readOnly
      extensions={extensionOf(...items)}
    />,
  );
  selectText(() => ref.current!);
  return container.querySelector<HTMLElement>('[data-quoin-host]')!;
}

describe('the bubble toolbar on a read-only canvas', () => {
  it('shows no toolbar when no item works read-only', () => {
    openReadOnly(item('Star'));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('shows only the items that work read-only, under a name of its own', () => {
    openReadOnly(item('Star', { whileReadOnly: true }), item('Moon'));
    expect(names()).toEqual(['Star']);
    expect(screen.getByRole('toolbar', { name: 'Comment tools' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bold' })).toBeNull();
  });

  it('shows no toolbar when the read-only item is unavailable', () => {
    openReadOnly(item('Star', { whileReadOnly: true, available: () => false }));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('takes focus from the text with Alt+F10 and gives it back on Escape', () => {
    const host = openReadOnly(item('Star', { whileReadOnly: true }));
    expect(host).toHaveFocus();
    act(() => void fireEvent.keyDown(host, { key: 'F10', altKey: true }));
    expect(within(screen.getByRole('toolbar')).getByRole('button', { name: 'Star' })).toHaveFocus();
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'Escape' }));
    expect(host).toHaveFocus();
  });

  it('leaves Alt+F10 to the page when it shows no toolbar', () => {
    const host = openReadOnly(item('Star'));
    expect(fireEvent.keyDown(host, { key: 'F10', altKey: true })).toBe(true);
    expect(host).toHaveFocus();
  });

  it('gives focus back to the text when the canvas turns read-only with focus on a tool that goes', async () => {
    const ref = createRef<QuoinEditorHandle>();
    const blocks = [paragraph('a', 'hello world')];
    const extensions = extensionOf(item('Star', { whileReadOnly: true }));
    const draw = (readOnly: boolean) => (
      <BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} readOnly={readOnly} extensions={extensions} />
    );
    const { container, rerender } = render(draw(false));
    selectText(() => ref.current!);
    act(() => within(screen.getByRole('toolbar')).getByRole('button', { name: 'Bold' }).focus());
    rerender(draw(true));
    await act(async () => {});
    expect(document.activeElement).toBe(container.querySelector('[data-quoin-host]'));
    expect(names()).toEqual(['Star']);
  });

  it('shows every item on an editable canvas', () => {
    const canvas = mountCanvas([paragraph('a', 'hello world')], {
      extensions: extensionOf(item('Star', { whileReadOnly: true }), item('Moon')),
    });
    selectText(canvas.handle);
    const toolbar = screen.getByRole('toolbar', { name: 'Text formatting' });
    for (const name of ['Bold', 'Star', 'Moon']) expect(within(toolbar).getByRole('button', { name })).toBeTruthy();
  });
});
