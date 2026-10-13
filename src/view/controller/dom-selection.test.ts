import { describe, expect, it } from 'vitest';
import { text } from '../../engine/model/inline';
import { renderInline } from '../dom/render-inline';
import { createHostRegistry } from './host-registry';
import { readSelection, writeSelection } from './dom-selection';

function setup() {
  const registry = createHostRegistry();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const make = (id: string, value: string) => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    root.appendChild(el);
    renderInline(el, [text(value)], []);
    registry.register(id, 'text', el);
    return el;
  };
  return { registry, a: make('a', 'hello'), b: make('b', 'world'), root };
}

describe('DOM selection mapping', () => {
  it('reads a caret and a range across hosts', () => {
    const { registry, a, b } = setup();
    const sel = document.getSelection()!;
    sel.setBaseAndExtent(a.firstChild!, 2, a.firstChild!, 2);
    expect(readSelection(registry, sel)).toEqual({ kind: 'text', anchor: { block: 'a', region: 'text', offset: 2 }, head: { block: 'a', region: 'text', offset: 2 } });
    sel.setBaseAndExtent(b.firstChild!, 3, a.firstChild!, 1);
    expect(readSelection(registry, sel)).toEqual({ kind: 'text', anchor: { block: 'b', region: 'text', offset: 3 }, head: { block: 'a', region: 'text', offset: 1 } });
  });

  it('returns null outside the hosts', () => {
    const { registry } = setup();
    const outside = document.createTextNode('x');
    document.body.appendChild(outside);
    document.getSelection()!.setBaseAndExtent(outside, 0, outside, 1);
    expect(readSelection(registry, document.getSelection())).toBeNull();
  });

  it('writes a caret into one host and declines cross-host ranges', () => {
    const { registry, a } = setup();
    const sel = document.getSelection()!;
    const pos = (block: string, offset: number) => ({ block, region: 'text', offset });
    expect(writeSelection(registry, { kind: 'text', anchor: pos('a', 4), head: pos('a', 4) }, sel, () => undefined)).toBe(true);
    expect(sel.anchorNode).toBe(a.firstChild);
    expect(sel.anchorOffset).toBe(4);
    expect(writeSelection(registry, { kind: 'text', anchor: pos('a', 1), head: pos('b', 1) }, sel, () => undefined)).toBe(false);
  });

  it('reads a selection inside a block element outside any host as a node selection', () => {
    const { registry, root, a } = setup();
    const divider = document.createElement('div');
    divider.appendChild(document.createElement('hr'));
    root.appendChild(divider);
    const blockAt = (node: Node) => (divider.contains(node) ? 'd' : undefined);
    const sel = document.getSelection()!;
    sel.collapse(divider, 1);
    expect(readSelection(registry, sel, blockAt)).toEqual({ kind: 'node', block: 'd' });
    sel.setBaseAndExtent(a.firstChild!, 1, divider, 1);
    expect(readSelection(registry, sel, blockAt)).toBeNull();
  });

  it('writes a node selection by focusing its block element', () => {
    const { registry, root } = setup();
    const divider = document.createElement('div');
    divider.tabIndex = -1;
    root.appendChild(divider);
    const sel = document.getSelection()!;
    const write = writeSelection(registry, { kind: 'node', block: 'd' }, sel, (id) => (id === 'd' ? divider : undefined));
    expect(write).toBe(true);
    expect(document.activeElement).toBe(divider);
    expect(divider.contains(sel.anchorNode)).toBe(true);
    expect(writeSelection(registry, { kind: 'node', block: 'x' }, sel, () => undefined)).toBe(false);
  });

  it('leaves a DOM selection that already maps to the target alone', () => {
    const { registry, a } = setup();
    const sel = document.getSelection()!;
    sel.collapse(a, 0);
    const caret = { block: 'a', region: 'text', offset: 0 };
    expect(writeSelection(registry, { kind: 'text', anchor: caret, head: caret }, sel, () => undefined)).toBe(true);
    expect(sel.anchorNode).toBe(a);
  });

  it('keeps ranges inside their content and carets after the text before them', () => {
    const { registry, root } = setup();
    const c = document.createElement('div');
    root.appendChild(c);
    renderInline(c, [text('ab', [{ type: 'bold' }]), text('cd')], []);
    registry.register('c', 'text', c);
    const bold = c.querySelector('strong')!.firstChild;
    const plain = c.lastChild;
    const sel = document.getSelection()!;
    const pos = (offset: number) => ({ block: 'c', region: 'text', offset });
    const write = (anchor: number, head: number) => {
      writeSelection(registry, { kind: 'text', anchor: pos(anchor), head: pos(head) }, sel, () => undefined);
      return [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
    };
    expect(write(2, 4)).toEqual([plain, 0, plain, 2]);
    expect(write(2, 0)).toEqual([bold, 2, bold, 0]);
    expect(write(2, 2)).toEqual([bold, 2, bold, 2]);
  });

  it('declines block ranges and a missing selection', () => {
    const { registry } = setup();
    const sel = document.getSelection()!;
    expect(writeSelection(registry, { kind: 'blocks', anchor: 'a', head: 'b' }, sel, () => undefined)).toBe(false);
    expect(writeSelection(registry, null, sel, () => undefined)).toBe(false);
  });
});
