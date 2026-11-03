import { toMarkdown, type QuoinBlock } from '../../engine';
import { blockLines } from './source-lines';

const m = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

const CASES: [string, QuoinBlock[]][] = [
  ['paragraphs', [m('a', 'One.'), m('b', 'Two.')]],
  ['heading then paragraph', [m('a', '# Title'), m('b', 'Body.')]],
  ['a bullet list', [m('a', '- one'), m('b', '- two'), m('c', '- three')]],
  ['a task list', [m('a', '- [ ] one'), m('b', '- [x] two')]],
  ['list then paragraph', [m('a', '- one'), m('b', '- two'), m('c', 'After.')]],
  ['a quote', [m('a', '> quoted'), m('b', 'After.')]],
  ['nested list', [m('a', '- one'), { ...m('b', '- nested'), indent: 1 }, m('c', '- two')]],
  ['code block', [m('a', 'Before.'), { id: 'b', type: 'CODE', data: { code: 'x = 1\ny = 2', language: 'python' } }, m('c', 'After.')]],
  ['divider', [m('a', 'Before.'), { id: 'b', type: 'DIVIDER', data: {} }, m('c', 'After.')]],
  ['callout', [m('a', 'Before.'), { id: 'b', type: 'CALLOUT', data: { tone: 'tip', body: 'Note.' } }, m('c', 'After.')]],
];

// blockLines reads a block's place out of the lengths of the document's prefixes, which only works because every
// prefix of the block array serialises to a prefix of the whole document's markdown.
describe('the markdown of a prefix of the document', () => {
  it.each(CASES)('is a prefix of the whole markdown, for %s', (_name, blocks) => {
    const whole = toMarkdown(blocks);
    for (let i = 1; i < blocks.length; i += 1) expect(whole.startsWith(toMarkdown(blocks.slice(0, i)))).toBe(true);
  });

  it('is not recovered by joining the blocks on a fixed separator, so blockLines cannot work that way', () => {
    const blocks = [m('a', '- one'), m('b', '- two')];
    expect(blocks.map((block) => toMarkdown([block])).join('\n\n')).not.toBe(toMarkdown(blocks));
  });
});

describe('blockLines', () => {
  it.each(CASES)('names lines holding that block and no other, for %s', (_name, blocks) => {
    const lines = toMarkdown(blocks).split('\n');
    const spans = blocks.map((_block, index) => blockLines(blocks, index));
    for (const [index, span] of spans.entries()) {
      expect(span).not.toBeNull();
      expect(span!.from).toBeLessThanOrEqual(span!.to);
      expect(span!.to).toBeLessThan(lines.length);
      if (index > 0) expect(span!.from).toBeGreaterThan(spans[index - 1]!.to);
    }
  });

  it('starts the first block at the first line', () => {
    expect(blockLines([m('a', 'One.'), m('b', 'Two.')], 0)).toEqual({ from: 0, to: 0 });
  });

  it('leaves the blank line between two paragraphs out of either block', () => {
    const blocks = [m('a', 'One.'), m('b', 'Two.')];
    expect(toMarkdown(blocks)).toBe('One.\n\nTwo.\n');
    expect(blockLines(blocks, 1)).toEqual({ from: 2, to: 2 });
  });

  it('covers every line of a block that spans several', () => {
    const blocks: QuoinBlock[] = [m('a', 'Before.'), { id: 'b', type: 'CODE', data: { code: 'x = 1\ny = 2', language: 'python' } }];
    const span = blockLines(blocks, 1)!;
    const lines = toMarkdown(blocks).split('\n').slice(span.from, span.to + 1);
    expect(lines.join('\n')).toBe('```python\nx = 1\ny = 2\n```');
  });

  it('gives no span for an index outside the document', () => {
    expect(blockLines([m('a', 'One.')], 4)).toBeNull();
    expect(blockLines([m('a', 'One.')], -1)).toBeNull();
  });
});
