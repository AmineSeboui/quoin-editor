import { describe, expect, it } from 'vitest';
import { fuzzyFilter } from './fuzzy';

const items = [
  { title: 'Heading 1', keywords: ['h1', 'title'] },
  { title: 'Bulleted list', keywords: ['ul'] },
  { title: 'Numbered list', keywords: ['ol'] },
  { title: 'Toggle list' },
];

describe('fuzzyFilter', () => {
  it('ranks word prefixes, then keywords, then substrings, then subsequences', () => {
    expect(fuzzyFilter(items, 'list').map((i) => i.title)).toEqual(['Bulleted list', 'Numbered list', 'Toggle list']);
    expect(fuzzyFilter(items, 'h1').map((i) => i.title)).toEqual(['Heading 1']);
    expect(fuzzyFilter(items, 'bul').map((i) => i.title)).toEqual(['Bulleted list']);
    expect(fuzzyFilter(items, 'tgl').map((i) => i.title)).toEqual(['Toggle list']);
    expect(fuzzyFilter(items, 'zz')).toEqual([]);
    expect(fuzzyFilter(items, '')).toEqual(items);
  });
});
