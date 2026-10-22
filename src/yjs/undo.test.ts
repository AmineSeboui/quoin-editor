import { describe, expect, it } from 'vitest';
import { setAttrsStep } from '../engine/transform/attrs-steps';
import { removeBlocksStep } from '../engine/transform/block-steps';
import { caret, md, mod } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

function twoPeers() {
  const link = linkedDocs();
  const one = peer(link.docs[0], 'a', [md('a', 'hello'), md('b', 'world')]);
  link.flush();
  const two = peer(link.docs[1], 'b');
  return { ...link, one, two };
}

describe('undo through the shared document', () => {
  it('undoes a run of typing as one change and puts the caret back', () => {
    const { one } = twoPeers();
    one.editor.commands.setSelection(caret('a', 5));
    for (const key of ' you') one.editor.insertText(key);
    one.clock.now = 2000;
    one.editor.insertText('!');
    expect(one.editor.handleKey(mod('z'))).toBe(true);
    expect(one.editor.getBlocks()[0]).toEqual(md('a', 'hello you'));
    expect(one.editor.commands.undo()).toBe(true);
    expect(one.editor.getBlocks()[0]).toEqual(md('a', 'hello'));
    expect(one.editor.state.selection).toEqual(caret('a', 5));
    expect(one.editor.can().undo()).toBe(false);
  });

  it('undoes only its own changes, and the other client sees the undo', () => {
    const { one, two, flush } = twoPeers();
    one.editor.commands.setSelection(caret('a', 5));
    one.editor.insertText('!');
    flush();
    two.editor.commands.setSelection(caret('b', 0));
    two.editor.insertText('new ');
    flush();
    expect(one.editor.commands.undo()).toBe(true);
    flush();
    expect(one.editor.getBlocks()).toEqual([md('a', 'hello'), md('b', 'new world')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect(one.editor.can().undo()).toBe(false);
    expect(two.editor.can().undo()).toBe(true);
  });

  it('redoes what it undid, with the caret where it was before the undo', () => {
    const { one } = twoPeers();
    one.editor.commands.setSelection(caret('a', 5));
    one.editor.insertText('!');
    one.editor.commands.setSelection(caret('b', 1));
    one.editor.commands.undo();
    expect(one.editor.state.selection).toEqual(caret('a', 5));
    expect(one.editor.can().redo()).toBe(true);
    expect(one.editor.handleKey(mod('z', { shiftKey: true }))).toBe(true);
    expect(one.editor.getBlocks()[0]).toEqual(md('a', 'hello!'));
    expect(one.editor.state.selection).toEqual(caret('b', 1));
    expect(one.editor.can().redo()).toBe(false);
  });

  it('undoes a split, a join and a move', () => {
    const { one } = twoPeers();
    const start = one.editor.getBlocks();
    one.editor.commands.setSelection(caret('a', 2));
    one.editor.commands.splitBlock();
    one.editor.commands.setSelection(caret('b', 0));
    one.editor.commands.deleteBackward();
    one.editor.commands.setSelection(caret('a', 0));
    one.editor.commands.moveBlocksDown();
    expect(one.editor.getBlocks()).not.toEqual(start);
    while (one.editor.commands.undo());
    expect(one.editor.getBlocks()).toEqual(start);
  });

  it('undoes its split and its join and leaves what the other client typed meanwhile', () => {
    const { one, two, flush } = twoPeers();
    one.editor.commands.setSelection(caret('a', 2));
    one.editor.commands.splitBlock();
    flush();
    const tail = one.editor.state.doc.blocks[1].id;
    two.editor.commands.setSelection(caret(tail, 1));
    two.editor.insertText('X');
    flush();
    one.editor.commands.undo();
    flush();
    expect(one.editor.getBlocks()).toEqual([md('a', 'helXlo'), md('b', 'world')]);
    one.editor.commands.setSelection(caret('b', 0));
    one.editor.commands.deleteBackward();
    two.editor.commands.setSelection(caret('b', 5));
    two.editor.insertText('!');
    flush();
    one.editor.commands.undo();
    flush();
    expect(one.editor.getBlocks()).toEqual([md('a', 'helXlo'), md('b', 'world!')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('brings back a removed block with its type, indent and attrs', () => {
    const { one, two, flush } = twoPeers();
    one.editor.commands.setSelection(caret('b', 0));
    one.editor.commands.setAttrs({ kind: 'heading', level: 2 });
    one.editor.commands.indent();
    const kept = one.editor.getBlocks();
    one.editor.dispatch(one.editor.createTransaction().step(removeBlocksStep(1, 1)));
    flush();
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello')]);
    one.editor.commands.undo();
    flush();
    expect(one.editor.getBlocks()).toEqual(kept);
    expect(two.editor.getBlocks()).toEqual(kept);
  });

  it('keeps a change made outside the history out of the undo stack', () => {
    const { one } = twoPeers();
    const tr = one.editor.createTransaction().step(setAttrsStep('a', { kind: 'quote' })).setMeta('addToHistory', false);
    one.editor.dispatch(tr);
    expect(one.editor.can().undo()).toBe(false);
  });

  it("reaches the editor as this client's own history, not as a collaborator's change, and is not written back", () => {
    const { one, two, flush } = twoPeers();
    one.editor.commands.setSelection(caret('a', 5));
    one.editor.insertText('!');
    flush();
    const origins: (string | undefined)[] = [];
    one.editor.subscribe((_, tr) => origins.push(tr?.origin));
    one.editor.commands.undo();
    one.editor.commands.redo();
    one.editor.commands.undo();
    flush();
    expect(origins).toEqual(['history', 'history', 'history']);
    expect(one.editor.getBlocks()).toEqual([md('a', 'hello'), md('b', 'world')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect(one.editor.can().redo()).toBe(true);
    expect(one.editor.state.selection).toEqual(caret('a', 5));
  });

  it('has nothing to undo while disconnected', () => {
    const { one } = twoPeers();
    one.editor.commands.setSelection(caret('a', 5));
    one.editor.insertText('!');
    one.unmount();
    expect(one.editor.can().undo()).toBe(false);
    expect(one.editor.commands.undo()).toBe(false);
  });
});
