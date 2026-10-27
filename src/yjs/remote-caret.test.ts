import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

function setup() {
  const { docs, flush } = linkedDocs();
  const one = peer(docs[0], 'a', [md('p', 'zz'), md('b', 'abcdef')]);
  flush();
  const two = peer(docs[1], 'b');
  two.editor.commands.setSelection(caret('b', 3));
  const { text } = one.collaboration;
  const markers = new Map<unknown, Y.Map<unknown>>();
  const starts = new Map<unknown, number>();
  let at = 0;
  let last: unknown = null;
  for (const { insert } of text.toDelta() as { insert: unknown }[]) {
    if (insert instanceof Y.Map) markers.set((last = insert.get('id')), insert);
    else if (typeof insert === 'string' && !starts.has(last)) starts.set(last, at);
    at += typeof insert === 'string' ? insert.length : 1;
  }
  const remote = (change: () => void) => {
    text.doc!.transact(change);
    flush();
    return two.editor.state.selection;
  };
  return { one, two, flush, text, remote, marker: (id: string) => markers.get(id)!, start: (id: string) => starts.get(id)! };
}

describe('the local caret after a remote change read again as blocks or as the whole text', () => {
  it('moves on by the characters typed before it in its block along with a change of the type of that block', () => {
    const { text, remote, marker, start } = setup();
    expect(remote(() => (text.insert(start('b'), 'xx'), marker('b').set('type', 'MARKDOWN')))).toEqual(caret('b', 5));
  });

  it('moves on by the characters typed before it in its block along with a change of the id of another block', () => {
    const { text, remote, marker, start } = setup();
    expect(remote(() => (text.insert(start('b'), 'xx'), marker('p').set('id', 'q')))).toEqual(caret('b', 5));
  });

  it('stays on its character when the block above is typed in and has its type changed', () => {
    const { text, remote, marker, start } = setup();
    expect(remote(() => (text.insert(start('p'), 'xx'), marker('p').set('type', 'MARKDOWN')))).toEqual(caret('b', 3));
  });

  it('stays on its character when another client turns the block above into a code block', () => {
    const { one, two, flush } = setup();
    one.editor.commands.setSelection({ kind: 'node', block: 'p' });
    one.editor.commands.setBlockType('CODE');
    flush();
    expect(two.editor.getBlocks()[0].type).toBe('CODE');
    expect(two.editor.state.selection).toEqual(caret('b', 3));
  });

  it('moves on by the characters typed before it in its block', () => {
    const { text, remote, start } = setup();
    expect(remote(() => text.insert(start('b'), 'xx'))).toEqual(caret('b', 5));
  });
});
