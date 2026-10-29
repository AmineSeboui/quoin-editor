import { act, fireEvent, screen } from '@testing-library/react';
import { ListChecks } from 'lucide-react';
import { defineBlock } from '../../registry';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph, testBlockTypes } from './test-canvas';

type TodoData = { done: boolean; note: string };

const todo = defineBlock<TodoData>({
  type: 'TODO',
  label: 'Todo',
  icon: ListChecks,
  editor: ({ data }) => <p>{data.note}</p>,
  preview: ({ data, onChange }) => (
    <div>
      <input aria-label="Done" type="checkbox" checked={data.done} onChange={() => onChange?.({ ...data, done: !data.done })} />
      <input aria-label="Note" value={data.note} onChange={(event) => onChange?.({ ...data, note: event.target.value })} />
      <div aria-label="Rich note" contentEditable suppressContentEditableWarning />
    </div>
  ),
});

const item = (done: boolean): QuoinBlock => ({ id: 'k', type: 'TODO', data: { done, note: '' } });
const doc = [paragraph('a', 'above'), item(false), paragraph('c', 'below')];

function mount() {
  const canvas = mountCanvas(doc, { blockTypes: [...testBlockTypes, todo] });
  const press = (target: Element, key: string, extra: { shiftKey?: boolean } = {}) => {
    const mod = canvas.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    let unhandled = true;
    act(() => void (unhandled = fireEvent.keyDown(target, { key, ...mod, ...extra })));
    return !unhandled;
  };
  const done = () => canvas.handle().editor.getBlocks()[1].data.done;
  return { ...canvas, press, done };
}

describe('undo and redo keys on a control in a custom block preview', () => {
  it('undo and redo the document as they do on the block itself', () => {
    const { press, done } = mount();
    const checkbox = screen.getByRole('checkbox', { name: 'Done' });
    act(() => checkbox.focus());
    fireEvent.click(checkbox);
    expect(done()).toBe(true);
    expect(press(screen.getByRole('checkbox', { name: 'Done' }), 'z')).toBe(true);
    expect(done()).toBe(false);
    expect(press(screen.getByRole('checkbox', { name: 'Done' }), 'Z', { shiftKey: true })).toBe(true);
    expect(done()).toBe(true);
    press(screen.getByRole('checkbox', { name: 'Done' }), 'z');
    expect(press(screen.getByRole('checkbox', { name: 'Done' }), 'y')).toBe(true);
    expect(done()).toBe(true);
  });

  it('leave the undo of a text field in the preview to the field', () => {
    const { press, done } = mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Done' }));
    expect(press(screen.getByRole('textbox', { name: 'Note' }), 'z')).toBe(false);
    expect(press(screen.getByLabelText('Rich note'), 'z')).toBe(false);
    expect(done()).toBe(true);
  });

  it('leave other keys with a modifier to the control', () => {
    const { press, changes } = mount();
    const count = changes.length;
    expect(press(screen.getByRole('checkbox', { name: 'Done' }), 'b')).toBe(false);
    expect(changes).toHaveLength(count);
  });
});
