import { describe, expect, it } from 'vitest';
import { atom, normalizeInline, text } from '../../engine/model/inline';
import type { Decoration } from '../../engine';
import { segmentSignature, toSegments } from './segments';

const b = { type: 'bold' };

describe('toSegments', () => {
  it('cuts at nodes and at decoration edges', () => {
    const segs = toSegments(normalizeInline([text('abcd', [b]), atom('math', { latex: 'x' })]), [
      { kind: 'inline', block: 'p', region: 'text', from: 1, to: 3, attrs: { class: 'hit' } },
    ]);
    expect(segs.map((s) => (s.kind === 'text' ? [s.text, s.from, s.decorations.length] : [s.kind, s.from]))).toEqual([
      ['a', 0, 0],
      ['bc', 1, 1],
      ['d', 3, 0],
      ['atom', 4],
    ]);
  });

  it('places widgets at their offset by side', () => {
    const segs = toSegments([text('ab')], [
      { kind: 'widget', block: 'p', region: 'text', offset: 1, key: 'w1', widget: 'caret', attrs: {}, side: -1 },
    ]);
    expect(segs.map((s) => s.kind)).toEqual(['text', 'widget', 'text']);
  });

  it('gives equal signatures to equal formatting with different text', () => {
    const [x] = toSegments([text('a', [b])], []);
    const [y] = toSegments([text('zzz', [b])], []);
    expect(segmentSignature(x)).toBe(segmentSignature(y));
  });
});

const inlineDeco = (from: number, to: number, attrs: Record<string, string> = { class: 'hit' }): Decoration => ({
  kind: 'inline',
  block: 'p',
  region: 'text',
  from,
  to,
  attrs,
});

const widgetDeco = (offset: number, key: string, side?: -1 | 1): Decoration => ({
  kind: 'widget',
  block: 'p',
  region: 'text',
  offset,
  key,
  widget: 'caret',
  attrs: {},
  ...(side === undefined ? {} : { side }),
});

const shape = (segments: ReturnType<typeof toSegments>) =>
  segments.map((s) => (s.kind === 'widget' ? `<${s.decoration.key}@${s.from}>` : s.kind === 'text' ? s.text : s.kind));

describe('toSegments widgets', () => {
  it('orders widgets at one offset by side, then by their order in the list', () => {
    const decorations = [widgetDeco(1, 'w1', 1), widgetDeco(1, 'w2', -1), widgetDeco(1, 'w3'), widgetDeco(1, 'w4', -1)];
    expect(shape(toSegments([text('ab')], decorations))).toEqual(['a', '<w2@1>', '<w4@1>', '<w1@1>', '<w3@1>', 'b']);
  });

  it('puts widgets at the start, at the end and in an empty region', () => {
    expect(shape(toSegments([text('ab')], [widgetDeco(2, 'end'), widgetDeco(0, 'start')]))).toEqual(['<start@0>', 'ab', '<end@2>']);
    expect(shape(toSegments([], [widgetDeco(0, 'only')]))).toEqual(['<only@0>']);
  });

  it('clamps a widget offset into the region', () => {
    expect(shape(toSegments([text('ab')], [widgetDeco(9, 'far'), widgetDeco(-3, 'near')]))).toEqual(['<near@0>', 'ab', '<far@2>']);
  });

  it('places a widget between an atom and the text around it', () => {
    const nodes = normalizeInline([text('a'), atom('math', { latex: 'x' }), text('b')]);
    expect(shape(toSegments(nodes, [widgetDeco(1, 'before'), widgetDeco(2, 'after')]))).toEqual([
      'a',
      '<before@1>',
      'atom',
      '<after@2>',
      'b',
    ]);
  });
});

describe('toSegments decorations', () => {
  it('nests overlapping decorations in list order and cuts at every edge', () => {
    const segs = toSegments([text('abc')], [inlineDeco(0, 3, { class: 'outer' }), inlineDeco(1, 2, { class: 'inner' })]);
    expect(segs.map((s) => (s.kind === 'text' ? [s.text, s.decorations.map((d) => d.class)] : s.kind))).toEqual([
      ['a', ['outer']],
      ['b', ['outer', 'inner']],
      ['c', ['outer']],
    ]);
  });

  it('clips decorations to the region and ignores empty, reversed and block ones', () => {
    const segs = toSegments([text('ab')], [
      inlineDeco(-3, 99),
      inlineDeco(1, 1, { class: 'empty' }),
      inlineDeco(2, 0, { class: 'reversed' }),
      inlineDeco(5, 9, { class: 'outside' }),
      { kind: 'block', block: 'p', attrs: { class: 'block' } },
    ]);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ kind: 'text', text: 'ab', decorations: [{ class: 'hit' }] });
  });

  it('carries the decorations that cover an atom', () => {
    const nodes = normalizeInline([text('a'), atom('math', { latex: 'x' })]);
    const segs = toSegments(nodes, [inlineDeco(0, 2), inlineDeco(1, 2, { class: 'atom-only' })]);
    expect(segs.map((s) => s.kind === 'widget' ? 0 : s.decorations.length)).toEqual([1, 2]);
  });

  it('skips empty text nodes', () => {
    expect(shape(toSegments([text(''), text('a'), text('')], []))).toEqual(['a']);
  });
});

describe('segmentSignature', () => {
  const sig = (inlineNodes: Parameters<typeof toSegments>[0], decorations: readonly Decoration[] = []) =>
    toSegments(inlineNodes, decorations).map(segmentSignature);

  it('tells apart different marks, mark attributes and decorations', () => {
    const marks = (m: { type: string; attrs?: Record<string, string> }) => sig([text('a', [m])])[0];
    expect(marks({ type: 'bold' })).not.toBe(marks({ type: 'italic' }));
    expect(marks({ type: 'link', attrs: { href: 'a' } })).not.toBe(marks({ type: 'link', attrs: { href: 'b' } }));
    expect(sig([text('a')], [inlineDeco(0, 1)])[0]).not.toBe(sig([text('a')])[0]);
    expect(sig([text('a')], [inlineDeco(0, 1, { class: 'x' })])[0]).not.toBe(sig([text('a')], [inlineDeco(0, 1, { class: 'y' })])[0]);
  });

  it('ignores the order of attribute keys', () => {
    const a = { type: 'wiki', attrs: { x: '1', y: '2' } };
    const b = { type: 'wiki', attrs: { y: '2', x: '1' } };
    expect(sig([text('a', [a])])).toEqual(sig([text('a', [b])]));
  });

  it('includes an atom by its attributes and a widget by its key', () => {
    expect(sig([atom('mention', { id: '1', label: 'A' })])).not.toEqual(sig([atom('mention', { id: '1', label: 'B' })]));
    expect(sig([atom('mention', { id: '1', label: 'A' })])).toEqual(sig([atom('mention', { label: 'A', id: '1' })]));
    expect(sig([], [widgetDeco(0, 'k1')])).not.toEqual(sig([], [widgetDeco(0, 'k2')]));
    expect(sig([], [widgetDeco(0, 'k1', -1)])).toEqual(sig([], [widgetDeco(3, 'k1', 1)]));
  });
});
