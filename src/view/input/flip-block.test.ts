import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, nodeSelection, textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { flipSelectedBlock } from './flip-block';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const toggle = (id: string, open: boolean): QuoinBlock => ({ id, type: 'TOGGLE', data: { markdown: 'Summary', open } });
const at = (block: string, offset: number) => textSelection({ block, region: 'text', offset });

function setup(blocks: QuoinBlock[]) {
  const editor = createEditor({ blocks, isMac: false });
  const controller = new ViewController({ editor });
  const select = (selection: ReturnType<typeof at>) =>
    controller.dispatch(editor.createTransaction().setSelection(selection));
  const spoken = () => controller.announcer.current()?.message ?? null;
  return { editor, controller, select, spoken };
}

describe('flipSelectedBlock', () => {
  it('checks the task that holds the caret, unchecks it again and announces each state', () => {
    const { editor, controller, select, spoken } = setup([md('a', 'plain'), md('t', '- [ ] job')]);
    select(at('t', 2));
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.getBlocks()[1].data.markdown).toBe('- [x] job');
    expect(editor.state.selection).toEqual(at('t', 2));
    expect(spoken()).toBe('checked');
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.getBlocks()[1].data.markdown).toBe('- [ ] job');
    expect(spoken()).toBe('unchecked');
  });

  it('flips a task whose text is selected inside the one block', () => {
    const { editor, controller, select } = setup([md('t', '- [ ] job')]);
    select(textSelection({ block: 't', region: 'text', offset: 0 }, { block: 't', region: 'text', offset: 3 }));
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('- [x] job');
  });

  it('closes and opens the toggle that holds the caret and announces each state', () => {
    const { editor, controller, select, spoken } = setup([toggle('t', true), { ...md('c', 'child'), indent: 1 }]);
    select(at('t', 3));
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.state.doc.blocks[0].attrs.open).toBe(false);
    expect(editor.state.selection).toEqual(at('t', 3));
    expect(spoken()).toBe('collapsed');
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.state.doc.blocks[0].attrs.open).toBe(true);
    expect(spoken()).toBe('expanded');
  });

  it('opens a toggle that was stored without an open flag', () => {
    const { editor, controller, select, spoken } = setup([{ id: 't', type: 'TOGGLE', data: { markdown: 'Summary' } }]);
    select(at('t', 0));
    expect(flipSelectedBlock(controller)).toBe(true);
    expect(editor.state.doc.blocks[0].attrs.open).toBe(true);
    expect(spoken()).toBe('expanded');
  });

  it('is a no-op in any other block, saying nothing and changing nothing', () => {
    const blocks = [md('a', 'plain'), md('b', '- bullet'), { id: 'd', type: 'DIVIDER', data: {} }, md('h', '# head')];
    const { editor, controller, select, spoken } = setup(blocks);
    const before = editor.state;
    for (const caret of [at('a', 1), at('b', 1), at('h', 1)]) {
      select(caret);
      const state = editor.state;
      expect(flipSelectedBlock(controller)).toBe(false);
      expect(editor.state).toBe(state);
    }
    controller.dispatch(editor.createTransaction().setSelection(nodeSelection('d')));
    const state = editor.state;
    expect(flipSelectedBlock(controller)).toBe(false);
    expect(editor.state).toBe(state);
    expect(editor.state.doc.blocks).toEqual(before.doc.blocks);
    expect(spoken()).toBeNull();
  });

  it('is a no-op for a selection across blocks or a block range', () => {
    const { editor, controller, select, spoken } = setup([md('t', '- [ ] one'), md('u', '- [ ] two')]);
    const blocks = editor.state.doc.blocks;
    select(textSelection({ block: 't', region: 'text', offset: 1 }, { block: 'u', region: 'text', offset: 1 }));
    expect(flipSelectedBlock(controller)).toBe(false);
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('t', 'u')));
    expect(flipSelectedBlock(controller)).toBe(false);
    expect(editor.state.doc.blocks).toBe(blocks);
    expect(spoken()).toBeNull();
  });

  it('is a no-op in an empty document', () => {
    const { editor, controller } = setup([]);
    expect(editor.state.selection).toBeNull();
    expect(flipSelectedBlock(controller)).toBe(false);
  });

  it('does nothing while the editor is read-only', () => {
    const editor = createEditor({ blocks: [md('t', '- [ ] job')], isMac: false });
    const controller = new ViewController({ editor, readOnly: true });
    controller.dispatch(editor.createTransaction().setSelection(at('t', 1)));
    expect(flipSelectedBlock(controller)).toBe(false);
    expect(editor.getBlocks()[0].data.markdown).toBe('- [ ] job');
    expect(controller.announcer.current()).toBeNull();
  });
});
