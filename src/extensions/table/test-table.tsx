import { act, fireEvent, screen } from '@testing-library/react';
import { textSelection, type QuoinBlock } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { tableExtension } from './table-extension';

export const ROWS = [
  ['Name', 'Size'],
  ['a', '2'],
  ['b', '3'],
];

export const table = (data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 't',
  type: 'TABLE',
  data: { rows: ROWS, header: true, align: [null, null], ...data },
});

export const at = (row: number, col: number, offset = 0) => ({ block: 't', region: cellKey(row, col), offset });

export function mount(data: Record<string, unknown> = {}, options: Parameters<typeof mountCanvas>[1] = {}) {
  const mounted = mountCanvas([paragraph('p', 'Above'), table(data)], { extensions: [tableExtension()], ...options });
  const caretIn = (row: number, col: number) =>
    act(() => {
      const { controller } = mounted.handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(at(row, col))));
      controller.focus();
    });
  const dataOf = () => mounted.handle().editor.getBlocks()[1].data;
  const host = (row: number, col: number) => screen.getByRole('textbox', { name: `Row ${row + 1}, column ${col + 1}` });
  return { ...mounted, caretIn, dataOf, host };
}

export const key = (target: Element, init: KeyboardEventInit) => act(() => void fireEvent.keyDown(target, init));

// A pointer moved over the table draws the controls of the cell under it, so a handle is pressed where it is, without
// the moves that would take the pointer there from the corner of the page. jsdom has no PointerEvent, and React hears
// a pointer event by its type whatever its class.
export const press = (name: string) =>
  act(() => void screen.getByRole('button', { name }).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })));
