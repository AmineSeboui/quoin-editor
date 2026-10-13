import { describe, expect, it } from 'vitest';
import type { Mark } from '../model/types';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { insertAtom, setMark, toggleMark } from './marks';

const select = (markdown: string, from: number, to: number) =>
  buildState([markdown], { anchor: { block: 0, offset: from }, head: { block: 0, offset: to } });

const marksOf = (state: ReturnType<typeof select>): Mark[][] =>
  state.doc.blocks[0].regions.text.map((node) => [...node.marks]);

describe('marks that cannot be stored or read back', () => {
  const plain = () => select('click', 0, 5);

  it('refuses a link with an unsafe href and changes nothing', () => {
    const unsafe = { href: 'javascript:alert(1)' };
    for (const command of [setMark('link', unsafe), toggleMark('link', unsafe)]) {
      const attempt = run(plain(), command);
      expect(attempt.ok).toBe(false);
      expect(attempt.tr).toBeNull();
    }
    expect(run(buildState(['click'], { block: 0, offset: 2 }), setMark('link', unsafe)).ok).toBe(false);
  });

  it('stores the sanitized href of a link', () => {
    const next = run(plain(), setMark('link', { href: '  https://a.b  ' })).state;
    expect(markdownOf(next)).toEqual(['[click](https://a.b)']);
    expect(marksOf(next)[0]).toEqual([{ type: 'link', attrs: { href: 'https://a.b' } }]);
  });

  it('refuses a link without a usable href or with attributes the reader would drop', () => {
    expect(run(plain(), setMark('link')).ok).toBe(false);
    expect(run(plain(), setMark('link', { href: '' })).ok).toBe(false);
    expect(run(plain(), setMark('link', { href: 'https://a.b', target: '_blank' })).ok).toBe(false);
    expect(run(plain(), setMark('link', { href: 'https://a.b', title: 'Home' })).ok).toBe(true);
  });

  it('refuses a comment without an id', () => {
    expect(run(plain(), setMark('comment')).ok).toBe(false);
    expect(run(plain(), setMark('comment', { id: '' })).ok).toBe(false);
    expect(run(plain(), toggleMark('comment')).ok).toBe(false);
    expect(markdownOf(run(plain(), setMark('comment', { id: 'c1' })).state)).toEqual(['<span data-comment="c1">click</span>']);
  });

  it('refuses a custom mark whose attribute name is not valid', () => {
    expect(run(plain(), setMark('kbd', { 'x y': '1' })).ok).toBe(false);
    expect(run(plain(), setMark('kbd', { '': '1' })).ok).toBe(false);
    expect(run(plain(), setMark('', {})).ok).toBe(false);
    const fine = run(plain(), setMark('kbd', { 'data-x': '1' }));
    expect(markdownOf(fine.state)).toEqual(['<span data-mark="kbd" data-attr-data-x="1">click</span>']);
  });

  it('refuses a colour mark whose colour the reader would drop', () => {
    expect(run(plain(), setMark('highlight', { color: 'zzz' })).ok).toBe(false);
    expect(run(plain(), setMark('color', { color: '#f00' })).ok).toBe(false);
    expect(run(plain(), setMark('highlight')).ok).toBe(true);
  });

  it('refuses attributes on a mark that takes none', () => {
    expect(run(plain(), setMark('bold', { weight: '700' })).ok).toBe(false);
  });

  it('refuses an atom whose attribute name is not valid', () => {
    const caret = buildState(['x'], { block: 0, offset: 1 });
    expect(run(caret, insertAtom('emoji', { 'na me': 'x' })).ok).toBe(false);
    expect(run(caret, insertAtom('', {})).ok).toBe(false);
    expect(markdownOf(run(caret, insertAtom('emoji', { name: 'x' })).state)).toEqual(['x<span data-atom="emoji" data-attr-name="x"></span>']);
  });
});
