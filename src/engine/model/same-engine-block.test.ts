import { describe, expect, it } from 'vitest';
import { text } from './inline';
import { sameEngineBlock } from './same-engine-block';
import type { EngineBlock } from './types';

const base = (): EngineBlock => ({
  id: 'a',
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: [text('one', [{ type: 'bold' }])] },
});

describe('sameEngineBlock', () => {
  it('is true for equal copies', () => {
    expect(sameEngineBlock(base(), base())).toBe(true);
  });

  it.each<[string, (block: EngineBlock) => EngineBlock]>([
    ['id', (b) => ({ ...b, id: 'b' })],
    ['type', (b) => ({ ...b, type: 'CODE' })],
    ['indent', (b) => ({ ...b, indent: 1 })],
    ['an attr', (b) => ({ ...b, attrs: { kind: 'task' } })],
    ['a region text', (b) => ({ ...b, regions: { text: [text('two', [{ type: 'bold' }])] } })],
    ['a mark', (b) => ({ ...b, regions: { text: [text('one', [{ type: 'italic' }])] } })],
    ['an extra region', (b) => ({ ...b, regions: { ...b.regions, caption: [text('c')] } })],
    ['another region key', (b) => ({ ...b, regions: { caption: b.regions.text } })],
  ])('is false for a changed %s', (_, change) => {
    expect(sameEngineBlock(base(), change(base()))).toBe(false);
  });
});
