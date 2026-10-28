// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as diff from '../diff/index';
import { defineBlock as clientDefineBlock } from '../registry';
import { defineBlock, QuoinView } from './index';

const chart = defineBlock<{ points: number }>({
  type: 'CHART',
  label: 'Chart',
  icon: () => null,
  preview: ({ data }) => createElement('output', null, data.points),
});

describe('block definitions built on a server', () => {
  it('come from the view and diff entries with no DOM, the same defineBlock the main entry exports', () => {
    expect(typeof document).toBe('undefined');
    expect(defineBlock).toBe(clientDefineBlock);
    expect(diff.defineBlock).toBe(clientDefineBlock);
  });

  it("draw a custom block's preview through QuoinView", () => {
    const blocks = [{ id: 'c', type: 'CHART', data: { points: 3 } }];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={[chart]} />)).toContain('<output>3</output>');
  });
});

describe('a server-drawn block whose definition parses its data', () => {
  const task = defineBlock<{ title: string }>({
    type: 'TASK',
    label: 'Task',
    icon: () => null,
    parse: (data) => {
      if (data.broken) throw new Error('unreadable task');
      return { title: String(data.title ?? data.name ?? 'Untitled') };
    },
    preview: ({ data }) => createElement('output', null, data.title),
  });
  const draw = (data: Record<string, unknown>) =>
    renderToStaticMarkup(<QuoinView blocks={[{ id: 't', type: 'TASK', data }]} blockTypes={[task]} />);

  it('hands the preview the parsed data', () => {
    expect(draw({ name: 'Ship it' })).toContain('<output>Ship it</output>');
  });

  it('draws the rest of the document without the preview when parsing throws', () => {
    const blocks = [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'kept' } },
      { id: 't', type: 'TASK', data: { broken: true } },
    ];
    const html = renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={[task]} />);
    expect(html).toContain('kept');
    expect(html).toContain('data-type="TASK"');
    expect(html).not.toContain('<output>');
  });

  it('hands the preview the parsed data in a diff', () => {
    const before = [{ id: 't', type: 'TASK', data: { name: 'Old' } }];
    const after = [{ id: 't', type: 'TASK', data: { name: 'New' } }];
    expect(renderToStaticMarkup(<diff.QuoinDiff before={before} after={after} blockTypes={[task]} />)).toContain(
      '<output>New</output>',
    );
  });
});
