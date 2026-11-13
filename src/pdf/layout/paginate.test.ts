// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PageCanvas } from '../paint/page-canvas';
import type { Box, Frame } from './box';
import { paginate } from './paginate';

const geometry = { width: 200, height: 300, margin: { top: 50, right: 20, bottom: 50, left: 20 } };

// Each box draws a one point rectangle at its top, named by its x, so a page's content lists the boxes it holds.
const box = (name: number, height: number, extra: Partial<Box> = {}): Box => ({
  height,
  paint: (canvas: PageCanvas, top: number) => canvas.fillRect(name, top, 1, 1, [0, 0, 0]),
  ...extra,
});

const placed = (canvases: PageCanvas[]) =>
  canvases.map((canvas) => [...canvas.content().matchAll(/([\d.]+) ([\d.]+) 1 1 re/g)].map(([, x, y]) => [Number(x), 300 - Number(y) - 1]));

describe('paginate', () => {
  it('stacks boxes from the top margin and starts a page where the next one would cross the bottom margin', () => {
    const { pages } = paginate([box(1, 100), box(2, 100), box(3, 50)], geometry);
    expect(placed(pages)).toEqual([[[1, 50], [2, 150]], [[3, 50]]]);
  });

  it('drops a gap at the top of a page and a gap that does not fit, but keeps one between boxes', () => {
    const { pages } = paginate([{ height: 10, gap: true }, box(1, 100), { height: 10, gap: true }, box(2, 80), { height: 30, gap: true }, box(3, 10)], geometry);
    expect(placed(pages)).toEqual([[[1, 50], [2, 160]], [[3, 50]]]);
  });

  it('keeps a box with the next one, moving both to a new page', () => {
    const { pages } = paginate([box(1, 160), box(2, 20, { keepWithNext: true }), { height: 5, gap: true }, box(3, 20)], geometry);
    expect(placed(pages)).toEqual([[[1, 50]], [[2, 50], [3, 75]]]);
  });

  it('gives a page to a document with nothing in it', () => {
    expect(paginate([], geometry).pages).toHaveLength(1);
  });

  it('records where each anchored box lands', () => {
    const { anchors } = paginate([box(1, 150, { anchor: 'a' }), box(2, 100, { anchor: 'b' })], geometry);
    expect(anchors.get('a')).toEqual({ page: 0, top: 50 });
    expect(anchors.get('b')).toEqual({ page: 1, top: 50 });
  });

  it('paints a frame behind the boxes it holds on each page, from the first to the last of them there', () => {
    const frame: Frame = { x: 10, width: 100, fill: [0.5, 0.5, 0.5] };
    const { pages } = paginate([box(1, 100, { frames: [frame] }), box(2, 80, { frames: [frame] }), box(3, 30, { frames: [frame] })], geometry);
    const fills = pages.map((page) => [...page.content().matchAll(/0\.5 0\.5 0\.5 rg ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re f/g)].map((match) => match.slice(1).map(Number)));
    expect(fills).toEqual([[[10, 70, 100, 180]], [[10, 220, 100, 30]]]);
    expect(pages[0].content().indexOf('0.5 0.5 0.5 rg')).toBeLessThan(pages[0].content().indexOf('1 1 re'));
  });
});
