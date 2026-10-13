import { describe, expect, it } from 'vitest';
import { createSchema } from '../../schema/create-schema';
import type { BlockSpec } from '../../schema/types';
import { block, md } from './export-fixtures';
import { toMarkdown } from './to-markdown';

const chart: BlockSpec = {
  type: 'CHART',
  flow: 'void',
  fromData: (data) => ({ attrs: { title: data.title }, regions: {} }),
  toData: ({ attrs }) => ({ title: attrs.title }),
  initial: () => ({ attrs: {}, regions: {} }),
  toMarkdown: ({ attrs }, ctx) =>
    attrs.title ? `![${attrs.title}](${ctx.resolveAssetUrl('chart.png')}) ${ctx.comments}` : '',
};
const schema = createSchema({ blocks: [chart] });
const anchored = (text: string) => `${text} <span data-comment="c1">anchored</span>`;

describe('toMarkdown options', () => {
  it('writes a block with the writer of its spec, which gets the asset resolver and the comments flag', () => {
    const blocks = [block('CHART', { title: 'Q1' }), md('after')];
    expect(toMarkdown(blocks, { schema, resolveAssetUrl: (key) => `/cdn/${key}`, comments: false })).toBe(
      '![Q1](/cdn/chart.png) false\n\nafter\n',
    );
    expect(toMarkdown(blocks, { schema })).toBe('![Q1](chart.png) true\n\nafter\n');
  });

  it('skips a block whose writer returns nothing and writes it as a comment when lossless', () => {
    const blocks = [md('a'), block('CHART', {}), md('b')];
    expect(toMarkdown(blocks, { schema })).toBe('a\n\nb\n');
    expect(toMarkdown(blocks, { schema, lossless: true })).toBe('a\n\n<!-- quoin:CHART {"data":{}} -->\n\nb\n');
  });

  it('writes a block of an unregistered type as a comment', () => {
    expect(toMarkdown([block('CHART', { title: 'Q1' })])).toBe('<!-- quoin:CHART {"data":{"title":"Q1"}} -->\n');
  });

  it('keeps comment anchors by default and removes them from every region when off', () => {
    const blocks = [
      md(anchored('para')),
      block('CALLOUT', { tone: 'info', body: anchored('body') }),
      block('TOGGLE', { markdown: anchored('summary'), open: false }),
      block('TABLE', { rows: [[anchored('cell')]], header: true, align: [null] }),
    ];
    const kept = toMarkdown(blocks);
    expect(kept.match(/data-comment="c1"/g)).toHaveLength(4);
    expect(toMarkdown(blocks, { comments: false })).toBe(
      [
        'para anchored',
        '> [!NOTE]\n> body anchored',
        '<details>\n<summary>summary anchored</summary>\n\n</details>',
        '| cell anchored |\n| --- |',
      ].join('\n\n') + '\n',
    );
  });
});
