import { describe, expect, it } from 'vitest';
import { addMark, hasMark, isCoreMark, markKey, markRank, removeMark, sameMark, sameMarkSet, sortMarks } from './marks';

const bold = { type: 'bold' };
const link = (href: string) => ({ type: 'link', attrs: { href } });
const comment = (id: string) => ({ type: 'comment', attrs: { id } });

describe('marks', () => {
  it('ranks known marks and slots custom marks between sup and highlight', () => {
    expect(markRank('link')).toBe(0);
    expect(markRank('code')).toBe(11);
    expect(markRank('custom')).toBe(7.5);
    expect(markRank('toString')).toBe(7.5);
  });

  it('tells core marks from custom ones', () => {
    expect(isCoreMark('link')).toBe(true);
    expect(isCoreMark('background')).toBe(true);
    expect(isCoreMark('kbd')).toBe(false);
    expect(isCoreMark('constructor')).toBe(false);
  });

  it('keys comments by id and every other mark by type', () => {
    expect(markKey(comment('a'))).toBe('comment:a');
    expect(markKey(link('x'))).toBe('link');
  });

  it('compares attrs, treating absent attrs as empty', () => {
    expect(sameMark({ type: 'bold' }, { type: 'bold', attrs: {} })).toBe(true);
    expect(sameMark(link('a'), link('b'))).toBe(false);
  });

  it('sorts by rank then key', () => {
    expect(sortMarks([{ type: 'code' }, bold, link('a'), comment('b'), comment('a')]).map(markKey)).toEqual([
      'link',
      'comment:a',
      'comment:b',
      'bold',
      'code',
    ]);
  });

  it('replaces a mark with the same key and keeps the set sorted', () => {
    expect(addMark([bold, link('a')], link('b'))).toEqual([link('b'), bold]);
    expect(addMark([comment('a')], comment('b'))).toEqual([comment('a'), comment('b')]);
  });

  it('removes by mark or by type', () => {
    expect(removeMark([bold, comment('a'), comment('b')], comment('a'))).toEqual([comment('b'), bold]);
    expect(removeMark([bold, comment('a'), comment('b')], 'comment')).toEqual([bold]);
  });

  it('answers membership and set equality', () => {
    expect(hasMark([bold], 'bold')).toBe(true);
    expect(hasMark([link('a')], link('b'))).toBe(false);
    expect(sameMarkSet(sortMarks([bold, link('a')]), [link('a'), bold])).toBe(true);
  });

  it('never mutates the input set', () => {
    const set = Object.freeze([bold, comment('a')]);
    expect(sortMarks(set)).not.toBe(set);
    expect(addMark(set, link('a'))).toEqual([link('a'), comment('a'), bold]);
    expect(set).toEqual([bold, comment('a')]);
  });
});
