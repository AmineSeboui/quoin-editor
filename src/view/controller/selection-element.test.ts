import { describe, expect, it } from 'vitest';
import type { EditorState } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, textSelection } from '../../engine/state/selection';
import { createHostRegistry } from './host-registry';
import { selectionElement } from './selection-element';

function setup() {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
      { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } },
      { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'two' } },
    ],
  });
  const hosts = createHostRegistry();
  const shells = new Map<string, HTMLElement>();
  const draw = (id: string) => {
    const shell = document.createElement('div');
    const host = document.createElement('div');
    shells.set(id, shell);
    hosts.register(id, 'text', host);
    return { shell, host };
  };
  const at = (selection: EditorState['selection']): EditorState => ({ ...editor.state, selection });
  return { draw, at, rendered: { hosts, block: (id: string) => shells.get(id) } };
}

describe('selectionElement', () => {
  it('is the head host for a caret and the head shell for a block range', () => {
    const { draw, at, rendered } = setup();
    const b = draw('b');
    expect(selectionElement(at(textSelection({ block: 'b', region: 'text', offset: 1 })), rendered)).toBe(b.host);
    expect(selectionElement(at(blockRangeSelection('a', 'b')), rendered)).toBe(b.shell);
  });

  it('is the shell of the closed toggle hiding the head, even while the head is still drawn', () => {
    const { draw, at, rendered } = setup();
    const t = draw('t');
    draw('c');
    expect(selectionElement(at(textSelection({ block: 'c', region: 'text', offset: 1 })), rendered)).toBe(t.shell);
  });

  it('is the sink for a selection across hosts, or the head host while no sink is drawn', () => {
    const { draw, at, rendered } = setup();
    const b = draw('b');
    const cross = at(textSelection({ block: 'a', region: 'text', offset: 1 }, { block: 'b', region: 'text', offset: 1 }));
    expect(selectionElement(cross, rendered)).toBe(b.host);
    const sink = document.createElement('div');
    expect(selectionElement(cross, { ...rendered, sink: () => sink })).toBe(sink);
  });

  it('falls back to the first block when nothing stands for the head or there is no selection', () => {
    const { draw, at, rendered } = setup();
    const a = draw('a');
    expect(selectionElement(at(textSelection({ block: 'b', region: 'text', offset: 1 })), rendered)).toBe(a.host);
    expect(selectionElement(at(null), rendered)).toBe(a.host);
  });
});
