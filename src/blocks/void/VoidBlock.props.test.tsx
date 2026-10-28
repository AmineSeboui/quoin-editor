import { act, fireEvent, screen } from '@testing-library/react';
import { ListChecks } from 'lucide-react';
import { moveBlocksDown } from '../../engine/commands/block-structure';
import { defineBlock } from '../../registry';
import type { BlockPreviewProps, QuoinBlock } from '../../types';
import { mountCanvas, paragraph, testBlockTypes } from './test-canvas';

type ChecklistData = { done: boolean };

const renders = { preview: [] as string[], editor: [] as string[] };
const previewProps: BlockPreviewProps<ChecklistData>[] = [];

const checklist = defineBlock<ChecklistData>({
  type: 'CHECKLIST',
  label: 'Checklist',
  icon: ListChecks,
  editor: ({ data, blockId, index, onChange, onRemove }) => {
    renders.editor.push(blockId);
    return (
      <div>
        <p>{`Editing ${blockId} at ${index}`}</p>
        <input aria-label="Done in editor" type="checkbox" checked={data.done} onChange={() => onChange({ done: !data.done })} />
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  },
  preview: (props) => {
    const { data, blockId, onChange } = props;
    renders.preview.push(blockId ?? '');
    previewProps.push(props);
    return (
      <input
        aria-label={`Done ${blockId}`}
        type="checkbox"
        checked={data.done}
        disabled={onChange === undefined}
        onChange={() => onChange?.({ done: !data.done })}
      />
    );
  },
});

const item = (id: string, done = false): QuoinBlock => ({ id, type: 'CHECKLIST', data: { done } });
const pinned = (id: string): QuoinBlock => ({ ...item(id), type: 'PINNED_CHECKLIST' });
const doc: QuoinBlock[] = [paragraph('a', 'above'), item('k'), paragraph('c', 'below')];
const pinnedChecklist = { ...checklist, type: 'PINNED_CHECKLIST', alwaysEditing: true };
const blockTypes = [...testBlockTypes, checklist, pinnedChecklist];

function mount(blocks = doc, readOnly = false) {
  renders.preview.length = 0;
  renders.editor.length = 0;
  previewProps.length = 0;
  const canvas = mountCanvas(blocks, { blockTypes, readOnly });
  const undo = () => {
    const mod = canvas.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(canvas.shell('a'), { key: 'z', ...mod }));
  };
  const open = (id: string) => {
    canvas.nodeSelect(id);
    canvas.press('Enter');
  };
  return { ...canvas, undo, open };
}

describe('the props a custom block receives', () => {
  it('gives its editor the block id and its position, kept current as blocks move', () => {
    const { handle } = mount([paragraph('a', 'above'), pinned('m'), paragraph('c', 'below')]);
    expect(screen.getByText('Editing m at 1')).toBeInTheDocument();
    act(() => {
      handle().controller.focus({ block: 'a', region: 'text', offset: 0 });
      handle().controller.run(moveBlocksDown);
    });
    expect(handle().editor.getBlocks().map(({ id }) => id)).toEqual(['m', 'a', 'c']);
    expect(screen.getByText('Editing m at 0')).toBeInTheDocument();
  });

  it('removes the block from its editor as one step that undo restores, with the caret where deleting it puts it', () => {
    const { last, open, selection, undo } = mount();
    open('k');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Done in editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(last()).toEqual([doc[0], doc[2]]);
    expect(selection()).toEqual({
      kind: 'text',
      anchor: { block: 'a', region: 'text', offset: 5 },
      head: { block: 'a', region: 'text', offset: 5 },
    });
    undo();
    expect(last()).toEqual([doc[0], item('k', true), doc[2]]);
  });

  it('lets an editable preview write its data, which undo takes back', () => {
    const { last, undo } = mount();
    expect(previewProps.at(-1)?.blockId).toBe('k');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Done k' }));
    expect(last()).toEqual([doc[0], item('k', true), doc[2]]);
    expect(screen.getByRole('checkbox', { name: 'Done k' })).toBeChecked();
    undo();
    expect(last()).toEqual(doc);
  });

  it('gives a preview on a read-only canvas no onChange', () => {
    mount(doc, true);
    expect(previewProps.at(-1)).toEqual({ data: { done: false }, blockId: 'k' });
    expect(screen.getByRole('checkbox', { name: 'Done k' })).toBeDisabled();
  });

  it('does not draw a custom block again while another block is typed in', () => {
    const blocks = [paragraph('a', 'above'), item('k'), pinned('m')];
    const { handle } = mount(blocks);
    expect(renders.preview).toContain('k');
    expect(renders.editor).toContain('m');
    act(() => handle().controller.focus({ block: 'a', region: 'text', offset: 5 }));
    renders.preview.length = 0;
    renders.editor.length = 0;
    act(() => void handle().controller.edit(() => handle().editor.insertText('!')));
    act(() => void handle().controller.edit(() => handle().editor.insertText('?')));
    expect(handle().editor.getBlocks()[0].data).toEqual({ markdown: 'above!?' });
    expect(renders).toEqual({ preview: [], editor: [] });
  });
});
