import { act, fireEvent, screen } from '@testing-library/react';
import { ListTodo } from 'lucide-react';
import { moveBlocksDown } from '../../engine/commands/block-structure';
import { blockTypeSlashItems } from '../../menus/slash/slash-items';
import { defineBlock } from '../../registry';
import type { QuoinBlock } from '../../types';
import { insertAfterBlock } from './block-data';
import { mountCanvas, paragraph, testBlockTypes } from './test-canvas';

type TaskData = { version: 2; title: string; owner: string };

const parsed: Record<string, unknown>[] = [];

function parseTask(data: Record<string, unknown>): TaskData {
  parsed.push(data);
  if (data.broken) throw new Error('unreadable task');
  if (data.version === undefined && typeof data.name === 'string') return { version: 2, title: data.name, owner: '' };
  return { version: 2, title: String(data.title ?? 'Untitled'), owner: String(data.owner ?? '') };
}

const task = defineBlock<TaskData>({
  type: 'TASK',
  label: 'Task',
  icon: ListTodo,
  parse: parseTask,
  editor: ({ data, onChange }) => (
    <input aria-label="Task title" value={data.title} onChange={(event) => onChange({ ...data, title: event.target.value })} />
  ),
  preview: ({ data }) => <p>{`Task ${data.title} for ${data.owner || 'nobody'}, v${data.version}`}</p>,
});
const pinnedTask = { ...task, type: 'PINNED_TASK', alwaysEditing: true };
const blockTypes = [...testBlockTypes, task, pinnedTask];

const oldTask = (id: string, name: string, type = 'TASK'): QuoinBlock => ({ id, type, data: { name } });

function mount(blocks: QuoinBlock[], props = {}) {
  parsed.length = 0;
  return mountCanvas(blocks, { blockTypes, ...props });
}

describe('a block definition that parses its data', () => {
  it('seeds a block inserted after another without initialData with what it parses from nothing', () => {
    const { handle, last } = mount([paragraph('a', 'above')]);
    act(() => insertAfterBlock(handle().controller, 'a', 'TASK', blockTypes));
    expect(last()[1]).toEqual({ id: last()[1].id, type: 'TASK', data: { version: 2, title: 'Untitled', owner: '' } });
  });

  it('seeds a block inserted from the slash palette without initialData with what it parses from nothing', () => {
    const { handle, last } = mount([paragraph('a', '')]);
    const item = blockTypeSlashItems(blockTypes).find(({ id }) => id === 'block:TASK')!;
    act(() => {
      const { controller } = handle();
      controller.focus({ block: 'a', region: 'text', offset: 0 });
      controller.run(item.command!({ state: controller.editor.state } as never)!);
    });
    expect(last().find(({ type }) => type === 'TASK')?.data).toEqual({ version: 2, title: 'Untitled', owner: '' });
  });

  it('hands the preview old data migrated to the current shape', () => {
    mount([oldTask('t', 'Ship it')]);
    expect(screen.getByText('Task Ship it for nobody, v2')).toBeInTheDocument();
  });

  it('hands the editor old data migrated to the current shape', () => {
    mount([oldTask('t', 'Ship it', 'PINNED_TASK')]);
    expect(screen.getByRole('textbox', { name: 'Task title' })).toHaveValue('Ship it');
  });

  it('writes nothing until the first change, which writes the parsed shape', () => {
    const { changes, last } = mount([oldTask('t', 'Ship it', 'PINNED_TASK')]);
    expect(changes).toEqual([]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Task title' }), { target: { value: 'Shipped' } });
    expect(last()[0].data).toEqual({ version: 2, title: 'Shipped', owner: '' });
  });

  it('does not parse a block again when it draws again with the same data', () => {
    const { handle } = mount([paragraph('a', 'one'), oldTask('t', 'Ship it')]);
    const before = parsed.length;
    act(() => {
      const { controller } = handle();
      controller.focus({ block: 'a', region: 'text', offset: 0 });
      controller.run(moveBlocksDown);
    });
    expect(handle().editor.getBlocks().map(({ id }) => id)).toEqual(['t', 'a']);
    expect(before).toBeGreaterThan(0);
    expect(parsed.length).toBe(before);
  });

  describe('when parsing throws', () => {
    let logged: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => logged.mockRestore());

    it('draws the block fallback, reports the error and leaves the other blocks drawn', () => {
      const onError = vi.fn();
      mount([paragraph('a', 'one'), { id: 't', type: 'TASK', data: { broken: true } }], { onError });
      expect(screen.getByRole('group', { name: 'Block could not be drawn' })).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(new Error('unreadable task'));
      expect(screen.getByText('one')).toBeInTheDocument();
    });
  });
});
