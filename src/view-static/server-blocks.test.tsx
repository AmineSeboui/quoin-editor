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
