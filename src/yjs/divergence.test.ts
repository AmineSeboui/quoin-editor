import { describe, expect, it, vi } from 'vitest';
import { removeBlocksStep } from '../engine/transform/block-steps';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

describe('a change from the shared document that does not apply to the editor', () => {
  it('is reported to onError, and the editor takes the shared document as it reads', () => {
    const onError = vi.fn();
    const { docs, flush } = linkedDocs();
    const one = peer(docs[0], 'a', [md('a', 'hello'), md('b', 'world')], { onError });
    flush();
    const two = peer(docs[1], 'b');
    const { editor } = one;
    editor.dispatch(editor.createTransaction().setOrigin('remote').step(removeBlocksStep(1, 1)));
    two.editor.commands.setSelection(caret('b', 5));
    two.editor.insertText('!');
    flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(String(onError.mock.calls[0][0].message)).toMatch(/"b"/);
    expect(one.editor.getBlocks()).toEqual([md('a', 'hello'), md('b', 'world!')]);
  });

  it('is not reported when the change is one the editor reads again on purpose', () => {
    const onError = vi.fn();
    const { docs, flush } = linkedDocs();
    const one = peer(docs[0], 'a', [md('a', 'hello'), md('b', 'world')], { onError });
    flush();
    const two = peer(docs[1], 'b');
    two.editor.commands.setSelection(caret('a', 0));
    two.editor.commands.moveBlocksDown();
    flush();
    expect(one.editor.getBlocks()).toEqual([md('b', 'world'), md('a', 'hello')]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('still has the editor take the shared document when the onError it is given throws', () => {
    const thrown = new Error('host');
    const onError = vi.fn(() => {
      throw thrown;
    });
    const uncaught = vi.fn();
    const { docs, flush } = linkedDocs();
    const one = peer(docs[0], 'a', [md('a', 'hello'), md('b', 'world')], { onError });
    flush();
    const two = peer(docs[1], 'b');
    const { editor } = one;
    editor.dispatch(editor.createTransaction().setOrigin('remote').step(removeBlocksStep(1, 1)));
    two.editor.commands.setSelection(caret('b', 5));
    two.editor.insertText('!');
    try {
      flush();
    } catch (error) {
      uncaught(error);
    }
    expect(one.editor.getBlocks()).toEqual([md('a', 'hello'), md('b', 'world!')]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(uncaught).toHaveBeenCalledWith(thrown);
  });
});
