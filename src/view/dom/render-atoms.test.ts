import { describe, expect, it } from 'vitest';
import type { Decoration } from '../../engine';
import { atom, text } from '../../engine/model/inline';
import { domMapOf, isRendering, renderInline } from './render-inline';

const host = () => document.createElement('div');
const bold = { type: 'bold' };
const hit: Decoration = { kind: 'inline', block: 'p', region: 'text', from: 0, to: 1, attrs: { class: 'hit' } };
const caret = (offset: number, key = 'k', side?: -1 | 1): Extract<Decoration, { kind: 'widget' }> => ({
  kind: 'widget',
  block: 'p',
  region: 'text',
  offset,
  key,
  widget: 'caret',
  attrs: { 'data-user': 'Bo' },
  ...(side === undefined ? {} : { side }),
});

describe('atoms', () => {
  it('writes one data attribute per attribute in a fixed order and the default text per type', () => {
    const el = host();
    renderInline(el, [atom('math', { latex: 'x^2' }), atom('chip', { b: '2', a: '1' })], []);
    expect(el.innerHTML).toBe(
      '<span contenteditable="false" data-quoin-atom="math" data-latex="x^2">x^2</span>' +
        '<span contenteditable="false" data-quoin-atom="chip" data-a="1" data-b="2">chip</span>',
    );
  });

  it('skips attribute names the DOM would reject', () => {
    const el = host();
    renderInline(el, [atom('chip', { 'bad name': 'x', id: '1' })], []);
    expect(el.innerHTML).toBe('<span contenteditable="false" data-quoin-atom="chip" data-id="1">chip</span>');
  });

  it('wraps an atom in its marks and then its decorations', () => {
    const el = host();
    renderInline(el, [atom('math', { latex: 'x' }, [bold])], [hit]);
    expect(el.innerHTML).toBe(
      '<strong><span data-quoin-deco="" class="hit"><span contenteditable="false" data-quoin-atom="math" data-latex="x">x</span></span></strong>',
    );
  });

  it('uses the renderer registered for the atom type and passes the document', () => {
    const el = host();
    const seen: Document[] = [];
    renderInline(el, [text('a'), atom('mention', { id: '7', label: 'Bo' })], [], {
      atoms: {
        mention: (node, doc) => {
          seen.push(doc);
          const chip = doc.createElement('b');
          chip.textContent = node.attrs.label;
          return chip;
        },
      },
    });
    expect(el.innerHTML).toBe('a<b>Bo</b>');
    expect(seen).toEqual([document]);
  });

  it('lets atomText replace the default text of the default element', () => {
    const el = host();
    renderInline(el, [atom('mention', { id: '1', label: 'Ada' })], [], { atomText: (node) => `<${node.attrs.id}>` });
    expect(el.textContent).toBe('<1>');
  });

  it('does not mistake inherited object properties for registered renderers', () => {
    const el = host();
    renderInline(el, [atom('constructor', {})], [{ ...caret(1), widget: 'toString' }], { atoms: {}, widgets: {} });
    expect(el.innerHTML).toBe(
      '<span contenteditable="false" data-quoin-atom="constructor">constructor</span>' +
        '<span contenteditable="false" data-quoin-widget="toString"></span>',
    );
  });
});

describe('widgets', () => {
  it('uses the renderer registered for the widget name and gives it the decoration', () => {
    const el = host();
    renderInline(el, [text('ab')], [caret(1)], {
      widgets: {
        caret: (decoration, doc) => {
          const flag = doc.createElement('i');
          flag.textContent = decoration.attrs['data-user'];
          return flag;
        },
      },
    });
    expect(el.innerHTML).toBe('a<i>Bo</i>b');
  });

  it('renders widgets in side order and never inside marks', () => {
    const el = host();
    renderInline(el, [text('ab', [bold])], [caret(1, 'right'), caret(1, 'left', -1)], {
      widgets: {
        caret: (decoration, doc) => {
          const flag = doc.createElement('i');
          flag.textContent = decoration.key;
          return flag;
        },
      },
    });
    expect(el.innerHTML).toBe('<strong>a</strong><i>left</i><i>right</i><strong>b</strong>');
  });

  it('renders a widget in an empty region before the filler', () => {
    const el = host();
    const map = renderInline(el, [], [caret(0)]);
    expect(el.innerHTML).toBe('<span contenteditable="false" data-quoin-widget="caret"></span><br data-quoin-filler="">');
    expect(map.length).toBe(0);
  });
});

describe('renderer changes and the rendering flag', () => {
  it('keeps atom elements while the renderers stay the same and rebuilds them when a renderer changes', () => {
    const el = host();
    const make = (label: string) => (_node: unknown, doc: Document) => {
      const chip = doc.createElement('b');
      chip.textContent = label;
      return chip;
    };
    const first = { mention: make('one') };
    const nodes = [atom('mention', { id: '1', label: 'A' })];
    renderInline(el, nodes, [], { atoms: first });
    const chip = el.firstChild;
    renderInline(el, nodes, [], { atoms: first });
    expect(el.firstChild).toBe(chip);
    renderInline(el, nodes, [], { atoms: { mention: make('two') } });
    expect(el.innerHTML).toBe('<b>two</b>');
  });

  it('reports rendering only while the host is being written, even when a renderer throws', () => {
    const el = host();
    const during: boolean[] = [];
    expect(isRendering(el)).toBe(false);
    renderInline(el, [atom('x', {})], [], {
      atoms: {
        x: (_node, doc) => {
          during.push(isRendering(el));
          return doc.createElement('b');
        },
      },
    });
    expect(during).toEqual([true]);
    expect(isRendering(el)).toBe(false);
    expect(() =>
      renderInline(el, [atom('y', {})], [], {
        atoms: {
          y: () => {
            throw new Error('boom');
          },
        },
      }),
    ).toThrow('boom');
    expect(isRendering(el)).toBe(false);
  });

  it('has no map for a host that was never rendered', () => {
    expect(domMapOf(host())).toBeUndefined();
  });
});
