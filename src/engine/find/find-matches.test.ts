import { describe, expect, it } from 'vitest';
import { cellKey } from '../blocks/table-spec';
import { createDoc } from '../model/doc';
import { atom, text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineDoc } from '../model/types';
import { buildState } from '../test-support/build-state';
import { findMatches } from './find-matches';
import type { SearchOptions } from './find-types';

const PLAIN: SearchOptions = { caseSensitive: false, wholeWord: false, regex: false };

const docOf = (...blocks: (string | QuoinBlock)[]): EngineDoc => buildState(blocks).doc;
const plainDoc = (paragraph: string): EngineDoc => buildState([{ paragraph }]).doc;

function spans(doc: EngineDoc, query: string, options: Partial<SearchOptions> = {}) {
  const result = findMatches(doc, query, { ...PLAIN, ...options });
  if ('error' in result) throw new Error(result.error);
  return result.matches.map(({ block, region, from, to }) => `${block}/${region}:${from}-${to}`);
}

describe('findMatches', () => {
  it.each<[string, string, string, string[], Partial<SearchOptions>?]>([
    ['ignores case by default', 'The cat and the Cat', 'cat', ['b0/text:4-7', 'b0/text:16-19']],
    ['keeps case when asked', 'The cat and the Cat', 'Cat', ['b0/text:16-19'], { caseSensitive: true }],
    ['takes the query as text, not a pattern', 'a.b axb (c)', '.', ['b0/text:1-2']],
    ['escapes every pattern character', 'cost $5 (or [6]) a|b', '(or [6])', ['b0/text:8-16']],
    [
      'finds a word inside other words without whole word',
      'cat category bobcat',
      'cat',
      ['b0/text:0-3', 'b0/text:4-7', 'b0/text:16-19'],
    ],
    [
      'finds only whole words with whole word',
      'cat category bobcat cat_x',
      'cat',
      ['b0/text:0-3'],
      { wholeWord: true },
    ],
    ['treats accented letters as word characters', 'caf\u00e9 cafe caf', 'caf', ['b0/text:10-13'], { wholeWord: true }],
    ['treats letters of any script as word characters', '\u043a\u043e\u0442 \u043a\u043e\u0442\u044b', '\u043a\u043e\u0442', ['b0/text:0-3'], { wholeWord: true }],
    ['treats digits as word characters', 'v2 v 2v', 'v', ['b0/text:3-4'], { wholeWord: true }],
    [
      'runs a pattern in regex mode',
      'a1 b22 c333',
      '\\d+',
      ['b0/text:1-2', 'b0/text:4-6', 'b0/text:8-11'],
      { regex: true },
    ],
    ['ignores case in regex mode by default', 'Ab ab', 'ab', ['b0/text:0-2', 'b0/text:3-5'], { regex: true }],
    ['keeps case in regex mode when asked', 'Ab ab', 'ab', ['b0/text:3-5'], { regex: true, caseSensitive: true }],
    [
      'applies whole word to a pattern',
      'one bone one1 one',
      'o\\w+',
      ['b0/text:0-3', 'b0/text:9-13', 'b0/text:14-17'],
      { regex: true, wholeWord: true },
    ],
    ['skips zero-length matches without looping', 'aa b', 'a*', ['b0/text:0-2'], { regex: true }],
    ['finds nothing for an anchor alone', 'abc', '^', [], { regex: true }],
    ['keeps offsets exact where lowercasing changes the length', '\u0130x \u0130x', 'x', ['b0/text:1-2', 'b0/text:4-5']],
  ])('%s', (_, markdown, query, expected, options = {}) => {
    expect(spans(plainDoc(markdown), query, options)).toEqual(expected);
  });

  it('matches across marks, which never break a match', () => {
    expect(spans(docOf('a **bo**_ld_ word'), 'bold')).toEqual(['b0/text:2-6']);
  });

  it('never matches across or into an atom', () => {
    const math = atom('math', { latex: 'x' });
    const regions = { text: [text('ab'), math, text('cd ab'), math] };
    const doc = createDoc([{ id: 'b0', type: 'MARKDOWN', indent: 0, attrs: { kind: 'paragraph' }, regions }]);
    expect(spans(doc, 'bc')).toEqual([]);
    expect(spans(doc, 'b.c', { regex: true })).toEqual([]);
    expect(spans(doc, 'x')).toEqual([]);
    expect(spans(doc, 'ab')).toEqual(['b0/text:0-2', 'b0/text:6-8']);
    expect(spans(doc, 'cd', { wholeWord: true })).toEqual(['b0/text:3-5']);
  });

  it('finds matches in every text region, in document order', () => {
    const table: QuoinBlock = {
      id: 't',
      type: 'TABLE',
      data: { rows: Array.from({ length: 11 }, (_, row) => [`x${row}`, 'x']), header: true, align: [null, null] },
    };
    const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: 'x alt', caption: 'an x' } };
    const callout: QuoinBlock = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'x in a callout' } };
    const doc = docOf('- x item', table, image, callout, '> x quote');
    const found = spans(doc, 'x');
    expect(found.slice(0, 5)).toEqual([
      'b0/text:0-1',
      `b1/${cellKey(0, 0)}:0-1`,
      `b1/${cellKey(0, 1)}:0-1`,
      `b1/${cellKey(1, 0)}:0-1`,
      `b1/${cellKey(1, 1)}:0-1`,
    ]);
    expect(found.slice(19, 24)).toEqual([
      `b1/${cellKey(9, 0)}:0-1`,
      `b1/${cellKey(9, 1)}:0-1`,
      `b1/${cellKey(10, 0)}:0-1`,
      `b1/${cellKey(10, 1)}:0-1`,
      'b2/caption:3-4',
    ]);
    expect(found.slice(24)).toEqual(['b3/body:0-1', 'b4/text:0-1']);
  });

  it('finds nothing for an empty query', () => {
    expect(spans(plainDoc('anything'), '')).toEqual([]);
    expect(spans(plainDoc('anything'), '', { regex: true })).toEqual([]);
  });

  it('returns the error of an invalid pattern instead of throwing', () => {
    const result = findMatches(plainDoc('a(b'), 'a(', { ...PLAIN, regex: true });
    expect(result).toEqual({ error: expect.any(String) });
    expect('error' in result && result.error).not.toBe('');
    expect(findMatches(plainDoc('a)(b'), 'a)(b', { ...PLAIN, regex: true, wholeWord: true })).toEqual({
      error: expect.any(String),
    });
    expect(findMatches(plainDoc('a(b'), 'a(', PLAIN)).toEqual({
      matches: [{ block: 'b0', region: 'text', from: 0, to: 2 }],
    });
  });
});
