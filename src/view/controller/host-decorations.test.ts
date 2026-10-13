import { describe, expect, it } from 'vitest';
import type { Decoration } from '../../engine';
import { decorationsByHost, sameDecorations } from './host-decorations';
import { hostKey } from './host-registry';

const inline = (from: number, to: number, attrs = { class: 'x' }): Decoration =>
  ({ kind: 'inline', block: 'a', region: 'text', from, to, attrs });
const widget = (side: -1 | 1, attrs = {}): Decoration =>
  ({ kind: 'widget', block: 'a', region: 'text', offset: 1, key: 'k', widget: 'w', attrs, side });

describe('host decorations', () => {
  it('groups inline and widget decorations by host and leaves block decorations out', () => {
    const other: Decoration = { kind: 'inline', block: 'a', region: 'caption', from: 0, to: 1, attrs: {} };
    const groups = decorationsByHost([inline(0, 1), { kind: 'block', block: 'a', attrs: {} }, widget(1), other]);
    expect(groups.get(hostKey('a', 'text'))).toEqual([inline(0, 1), widget(1)]);
    expect(groups.get(hostKey('a', 'caption'))).toEqual([other]);
    expect(groups.size).toBe(2);
  });

  it('compares decorations by content rather than identity', () => {
    expect(sameDecorations([inline(0, 1), widget(1)], [inline(0, 1), widget(1)])).toBe(true);
    expect(sameDecorations([inline(0, 1)], [inline(0, 2)])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [inline(0, 1, { class: 'y' })])).toBe(false);
    expect(sameDecorations([widget(1)], [widget(-1)])).toBe(false);
    expect(sameDecorations([widget(1)], [widget(1, { title: 't' })])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [inline(0, 1), widget(1)])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [widget(1)])).toBe(false);
  });
});
