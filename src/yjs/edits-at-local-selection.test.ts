import { describe, expect, it } from 'vitest';
import { inlineText } from '../engine/model/inline';
import { caret, md, range } from '../engine/test-support/editor-fixtures';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

function clients() {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', [md('p', 'hello world'), md('q', 'after')]);
  mesh.flush();
  const two = peer(mesh.docs[1], 'b');
  return { ...mesh, one, two };
}

const texts = ({ editor }: Peer) => editor.state.doc.blocks.map((block) => inlineText(block.regions.text));

const backward = (block: string, from: number, to: number) => range(block, to, from);

describe('the local selection when another client edits exactly at it', () => {
  it('keeps the caret before what the other client types at it', () => {
    const { one, two, flush } = clients();
    one.editor.commands.setSelection(caret('p', 11));
    two.editor.commands.setSelection(caret('p', 11));
    two.editor.insertText(' Zed');
    flush();
    expect(texts(one)[0]).toBe('hello world Zed');
    expect(one.editor.state.selection).toEqual(caret('p', 11));
  });

  it('keeps the caret in its block when the other client presses Enter at it and types on', () => {
    const { one, two, flush } = clients();
    one.editor.commands.setSelection(caret('p', 5));
    two.editor.commands.setSelection(caret('p', 5));
    two.editor.commands.splitBlock();
    two.editor.insertText('/table');
    flush();
    expect(texts(one)).toEqual(['hello', '/table world', 'after']);
    expect(one.editor.state.selection).toEqual(caret('p', 5));
  });

  it('keeps what the other client types at either end of a range outside it', () => {
    const { one, two, flush } = clients();
    one.editor.commands.setSelection(range('p', 6, 11));
    two.editor.commands.setSelection(caret('p', 11));
    two.editor.insertText('!');
    two.editor.commands.setSelection(caret('p', 6));
    two.editor.insertText('X');
    flush();
    expect(texts(one)[0]).toBe('hello Xworld!');
    expect(one.editor.state.selection).toEqual(range('p', 7, 12));
  });

  it('keeps a backward range around the same text', () => {
    const { one, two, flush } = clients();
    one.editor.commands.setSelection(backward('p', 6, 11));
    two.editor.commands.setSelection(caret('p', 6));
    two.editor.insertText('X');
    two.editor.commands.setSelection(caret('p', 12));
    two.editor.insertText('!');
    flush();
    expect(one.editor.state.selection).toEqual(backward('p', 7, 12));
  });

  it('still carries the caret past what its own user types', () => {
    const { one, two, flush } = clients();
    one.editor.commands.setSelection(caret('p', 11));
    one.editor.insertText(' Zed');
    flush();
    expect(one.editor.state.selection).toEqual(caret('p', 15));
    expect(texts(two)[0]).toBe('hello world Zed');
  });
});
