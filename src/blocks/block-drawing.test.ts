import { Star } from 'lucide-react';
import { defineBlock } from '../registry';
import { drawsType, opensEditor } from './block-drawing';
import { coreBlocks } from './core';

const chart = defineBlock({ type: 'CHART', label: 'Chart', icon: Star, preview: () => null });
const snippet = defineBlock({ type: 'CODE', label: 'Snippet', icon: Star, preview: () => null });

describe('drawsType', () => {
  it('draws the code block only while a definition of CODE is registered', () => {
    expect(drawsType(coreBlocks, 'CODE')).toBe(true);
    expect(drawsType([snippet], 'CODE')).toBe(true);
    expect(drawsType([chart], 'CODE')).toBe(false);
  });

  it('draws the image block only while a definition of IMAGE is registered', () => {
    expect(drawsType(coreBlocks, 'IMAGE')).toBe(true);
    expect(drawsType([chart], 'IMAGE')).toBe(false);
  });

  it('draws its own text blocks and the divider whatever is registered', () => {
    for (const type of ['MARKDOWN', 'CALLOUT', 'TOGGLE', 'DIVIDER']) expect(drawsType([chart], type)).toBe(true);
  });
});

describe('opensEditor', () => {
  it("opens Quoin's code and image blocks, edited in place, but not a host definition of CODE without an editor", () => {
    expect(opensEditor(coreBlocks, 'CODE')).toBe(true);
    expect(opensEditor(coreBlocks, 'IMAGE')).toBe(true);
    expect(opensEditor([...coreBlocks, snippet], 'CODE')).toBe(false);
  });
});
