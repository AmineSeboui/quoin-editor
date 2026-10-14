import { describe, expect, it } from 'vitest';
import type { Decoration } from '../../engine';
import { atom, normalizeInline, text } from '../../engine/model/inline';
import { renderInline } from './render-inline';

const host = () => document.createElement('div');
const bold = { type: 'bold' };
const mention = atom('mention', { id: '1', label: 'Ada' });
const caret = (offset: number, side?: -1 | 1): Decoration => ({
  kind: 'widget',
  block: 'p',
  region: 'text',
  offset,
  key: `k${offset}`,
  widget: 'caret',
  attrs: {},
  ...(side === undefined ? {} : { side }),
});

describe('DomMap.toDom', () => {
  it('prefers the text after the offset for assoc 1 and the text before for assoc -1', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('ab', [bold]), text('cd')]), []);
    const [strong, tail] = [el.firstChild!.firstChild!, el.lastChild!];
    expect(map.toDom(2, 1)).toEqual({ node: tail, offset: 0 });
    expect(map.toDom(2, -1)).toEqual({ node: strong, offset: 2 });
    expect(map.toDom(0)).toEqual({ node: strong, offset: 0 });
    expect(map.toDom(4, 1)).toEqual({ node: tail, offset: 2 });
  });

  it('falls back to the text on the other side when only one side has text', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('a'), mention, text('b')]), []);
    const [first, , last] = Array.from(el.childNodes);
    expect(map.toDom(1, 1)).toEqual({ node: first, offset: 1 });
    expect(map.toDom(2, -1)).toEqual({ node: last, offset: 0 });
  });

  it('does not treat text across a line break as touching', () => {
    const el = host();
    const map = renderInline(el, [text('a\nb')], []);
    const [first, , last] = Array.from(el.childNodes);
    expect(map.toDom(1, 1)).toEqual({ node: first, offset: 1 });
    expect(map.toDom(2, -1)).toEqual({ node: last, offset: 0 });
  });

  it('points between children when no text touches the offset', () => {
    const el = host();
    const map = renderInline(el, [atom('math', { latex: 'x' }), atom('math', { latex: 'y' })], []);
    expect(map.toDom(0, 1)).toEqual({ node: el, offset: 0 });
    expect(map.toDom(1, 1)).toEqual({ node: el, offset: 1 });
    expect(map.toDom(1, -1)).toEqual({ node: el, offset: 1 });
    expect(map.toDom(2, 1)).toEqual({ node: el, offset: 2 });
    expect(map.toDom(0, -1)).toEqual({ node: el, offset: 0 });
  });

  it('points inside the element that holds a marked atom, on the requested side', () => {
    const el = host();
    const map = renderInline(el, [text('\n'), atom('math', { latex: 'x' }, [bold]), text('\n')], []);
    const strong = el.childNodes[1];
    expect(map.toDom(1, 1)).toEqual({ node: strong, offset: 0 });
    expect(map.toDom(1, -1)).toEqual({ node: el, offset: 1 });
    expect(map.toDom(2, -1)).toEqual({ node: strong, offset: 1 });
    expect(map.toDom(2, 1)).toEqual({ node: el, offset: 2 });
  });

  it('points before the filler at the end of an empty region or after a final line break', () => {
    const empty = host();
    expect(renderInline(empty, [], []).toDom(0)).toEqual({ node: empty, offset: 0 });
    const el = host();
    const map = renderInline(el, [text('a\n')], []);
    expect(map.length).toBe(2);
    expect(map.toDom(2, 1)).toEqual({ node: el, offset: 2 });
    expect(map.toDom(2, -1)).toEqual({ node: el, offset: 2 });
  });

  it('points after a trailing atom', () => {
    const el = host();
    const map = renderInline(el, [text('a'), mention], []);
    expect(map.toDom(2, 1)).toEqual({ node: el, offset: 2 });
    expect(map.toDom(2, -1)).toEqual({ node: el, offset: 2 });
  });

  it('clamps offsets outside the region', () => {
    const el = host();
    const map = renderInline(el, [text('ab')], []);
    expect(map.toDom(-4)).toEqual(map.toDom(0));
    expect(map.toDom(40)).toEqual(map.toDom(2));
  });

  it('skips over widgets to the text beside them', () => {
    const el = host();
    const map = renderInline(el, [text('ab')], [caret(1)]);
    const [first, , last] = Array.from(el.childNodes);
    expect(map.toDom(1, -1)).toEqual({ node: first, offset: 1 });
    expect(map.toDom(1, 1)).toEqual({ node: last, offset: 0 });
  });
});

describe('DomMap.fromDom', () => {
  it('reads text nodes, clamping an offset past the end', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('ab', [bold]), text('cd')]), []);
    const [strongText, tail] = [el.firstChild!.firstChild!, el.lastChild!];
    expect(map.fromDom(strongText, 1)).toBe(1);
    expect(map.fromDom(strongText, 99)).toBe(2);
    expect(map.fromDom(tail, 0)).toBe(2);
  });

  it('reads points between children of the host and of mark elements', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('ab', [bold]), mention, text('c', [bold])]), []);
    const [first, , last] = Array.from(el.childNodes);
    expect(map.fromDom(el, 1)).toBe(2);
    expect(map.fromDom(el, 2)).toBe(3);
    expect(map.fromDom(first, 0)).toBe(0);
    expect(map.fromDom(first, 1)).toBe(2);
    expect(map.fromDom(last, 1)).toBe(4);
  });

  it('reads line breaks and the filler', () => {
    const el = host();
    const map = renderInline(el, [text('a\n')], []);
    const [, lineBreak, filler] = Array.from(el.childNodes);
    expect(map.fromDom(lineBreak, 0)).toBe(1);
    expect(map.fromDom(lineBreak, 1)).toBe(2);
    expect(map.fromDom(filler, 0)).toBe(2);
    expect(map.fromDom(el, 2)).toBe(2);
    expect(map.fromDom(el, 3)).toBe(2);
  });

  it('maps a point inside an atom to its nearer edge', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('a'), mention, text('b')]), []);
    const chip = el.childNodes[1];
    const label = chip.firstChild!;
    expect(map.fromDom(label, 0)).toBe(1);
    expect(map.fromDom(label, 1)).toBe(1);
    expect(map.fromDom(label, 2)).toBe(2);
    expect(map.fromDom(label, 4)).toBe(2);
    expect(map.fromDom(chip, 0)).toBe(1);
    expect(map.fromDom(chip, 1)).toBe(2);
  });

  it('maps a point inside a marked atom through its wrapper', () => {
    const el = host();
    const map = renderInline(el, [text('a'), atom('math', { latex: 'x' }, [bold])], []);
    const strong = el.childNodes[1];
    expect(map.fromDom(strong, 0)).toBe(1);
    expect(map.fromDom(strong, 1)).toBe(2);
    expect(map.fromDom(strong.firstChild!.firstChild!, 1)).toBe(2);
  });

  it('maps a point inside a widget to the widget offset', () => {
    const el = host();
    const map = renderInline(el, [text('ab')], [caret(1)]);
    const widget = el.childNodes[1];
    expect(map.fromDom(widget, 0)).toBe(1);
    expect(map.fromDom(el, 1)).toBe(1);
    expect(map.fromDom(el, 2)).toBe(1);
  });

  it('maps a point inside a node the browser added to the position it holds', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('ab', [bold]), text('cd')]), []);
    const stray = document.createElement('div');
    stray.textContent = 'x';
    el.insertBefore(stray, el.lastChild);
    expect(map.fromDom(stray.firstChild!, 1)).toBe(2);
    const strong = el.firstChild as HTMLElement;
    const inner = document.createTextNode('z');
    strong.appendChild(inner);
    expect(map.fromDom(inner, 1)).toBe(2);
    expect(map.fromDom(document.createElement('div'), 0)).toBeNull();
  });

  it('returns the offsets the last render produced', () => {
    const el = host();
    renderInline(el, [text('ab')], []);
    const map = renderInline(el, [text('abcd')], []);
    expect(map.fromDom(el.firstChild!, 4)).toBe(4);
  });
});

describe('DomMap round trip', () => {
  it('maps every offset to a point that maps back to it, whichever side it prefers', () => {
    const cases = [
      normalizeInline([text('ab', [bold]), text('\n'), atom('math', { latex: 'x' }), text('cd'), text('\n')]),
      normalizeInline([mention, mention, text('\n\n'), text('z', [bold]), mention]),
      [],
      [text('\n')],
    ];
    for (const inline of cases) {
      const el = host();
      const decorations = [caret(0, -1), caret(1), caret(99)];
      const map = renderInline(el, inline, decorations);
      for (let offset = 0; offset <= map.length; offset++) {
        for (const assoc of [-1, 1] as const) {
          const point = map.toDom(offset, assoc);
          expect(map.fromDom(point.node, point.offset)).toBe(offset);
        }
      }
    }
  });
});
