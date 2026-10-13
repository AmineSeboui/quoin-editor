import { describe, expect, it } from 'vitest';
import { fromMarkdown } from './from-markdown';

describe('fromMarkdown options', () => {
  it('joins soft breaks with a space by default', () => {
    expect(fromMarkdown('a\nb')[0].data).toEqual({ markdown: 'a b' });
  });

  it('gives every block its own generated id by default', () => {
    const ids = fromMarkdown('a\n\nb\n\nc').map((block) => block.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it('asks the given id source once per block, in order', () => {
    const asked: string[] = [];
    const blocks = fromMarkdown('# a\n\nb\n\n---', {
      newId: () => {
        asked.push(`id${asked.length}`);
        return asked[asked.length - 1];
      },
    });
    expect(blocks.map((block) => block.id)).toEqual(['id0', 'id1', 'id2']);
  });

  it('puts the id first and leaves the indent out when it is zero', () => {
    const [block] = fromMarkdown('text', { newId: () => 'x' });
    expect(Object.keys(block)).toEqual(['id', 'type', 'data']);
  });
});
