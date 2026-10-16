import { coreExtensions, createEditor, defineExtension, nodeSelection, type Command, type QuoinBlock } from '../../engine';
import { createVoidEditing } from './void-editing';

const blocks: QuoinBlock[] = [
  { id: 'a', type: 'MARKDOWN', data: { markdown: 'above' } },
  { id: 'b', type: 'BOOKMARK', data: { url: 'quoin.dev' } },
];
const enter = { key: 'Enter', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

function editorWith(extensions = coreExtensions()) {
  const voidEditing = createVoidEditing();
  const editor = createEditor({ blocks, onChange: () => {}, extensions: [...extensions, voidEditing.extension] });
  editor.dispatch(editor.createTransaction().setSelection(nodeSelection('b')));
  return { editor, voidEditing };
}

describe('the void editing Enter binding', () => {
  it('outranks the core Enter, though listed after it, for a node-selected block with an editor', () => {
    const { editor, voidEditing } = editorWith();
    const start = vi.fn();
    voidEditing.register('b', start);
    expect(editor.handleKey(enter)).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(editor.getBlocks()).toEqual(blocks);
  });

  it('leaves Enter to the core keymap, which inserts a paragraph, when no editor is registered for the block', () => {
    const { editor, voidEditing } = editorWith();
    const stop = voidEditing.register('b', vi.fn());
    stop();
    expect(editor.handleKey(enter)).toBe(true);
    expect(editor.getBlocks().map((block) => block.type)).toEqual(['MARKDOWN', 'BOOKMARK', 'MARKDOWN']);
  });

  it('runs before a host binding of Enter at the default priority, and after one ranked above it', () => {
    const calls: string[] = [];
    const hostEnter = (name: string): Command => () => {
      calls.push(name);
      return false;
    };
    const host = [
      defineExtension({ name: 'host-default', keymap: { Enter: hostEnter('default') } }),
      defineExtension({ name: 'host-high', priority: 300, keymap: { Enter: hostEnter('high') } }),
    ];
    const { editor, voidEditing } = editorWith([...coreExtensions(), ...host]);
    voidEditing.register('b', () => calls.push('void'));
    editor.handleKey(enter);
    expect(calls).toEqual(['high', 'void']);
  });

  it('claims nothing for a selection that is not a node selection', () => {
    const { editor, voidEditing } = editorWith();
    const start = vi.fn();
    voidEditing.register('b', start);
    editor.dispatch(editor.createTransaction().setSelection(null));
    expect(voidEditing.extension.keymap?.Enter(editor.state)).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it('keeps a newer registration when an older one for the same block is withdrawn', () => {
    const { editor, voidEditing } = editorWith();
    const older = vi.fn();
    const newer = vi.fn();
    const withdrawOlder = voidEditing.register('b', older);
    voidEditing.register('b', newer);
    withdrawOlder();
    editor.handleKey(enter);
    expect(newer).toHaveBeenCalledTimes(1);
    expect(older).not.toHaveBeenCalled();
  });
});
