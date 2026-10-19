import { describe, expect, it } from 'vitest';
import { computeDropTarget } from './drop-target';

const STEP = 24;
const START = 100;

const block = (id: string, top: number, indent = 0, dragged = false) => ({
  id,
  top,
  bottom: top + 20,
  start: START,
  indent,
  dragged,
});

const target = (pointerX: number, pointerY: number, blocks: ReturnType<typeof block>[]) =>
  computeDropTarget({ pointerX, pointerY, blocks, indentStep: STEP, direction: 'ltr' });

const rightToLeft = (pointerX: number, pointerY: number, blocks: ReturnType<typeof block>[]) =>
  computeDropTarget({ pointerX, pointerY, blocks, indentStep: STEP, direction: 'rtl' });

describe('computeDropTarget', () => {
  const column = [block('a', 0), block('b', 30), block('c', 60)];

  it('picks the gap whose midpoint is nearest the pointer', () => {
    expect(target(START, 2, column)).toMatchObject({ index: 0, lineTop: 0 });
    expect(target(START, 22, column)).toMatchObject({ index: 1, lineTop: 25 });
    expect(target(START, 47, column)).toMatchObject({ index: 2, lineTop: 55 });
    expect(target(START, 400, column)).toMatchObject({ index: 3, lineTop: 80 });
    expect(target(START, -50, column)).toMatchObject({ index: 0, lineTop: 0 });
  });

  it('takes the indent from how far right of the block above the pointer is', () => {
    const nested = [block('a', 0), block('b', 30, 1), block('c', 60)];
    expect(target(START, 52, nested)).toMatchObject({ index: 2, indent: 0, lineStart: START });
    expect(target(START + 30, 52, nested)).toMatchObject({ index: 2, indent: 1, lineStart: START + STEP });
    expect(target(START + 2 * STEP - 5, 52, nested)).toMatchObject({ index: 2, indent: 2, lineStart: START + 2 * STEP });
  });

  it('takes the indent from how far left of the block above the pointer is when lines run right to left', () => {
    const nested = [block('a', 0), block('b', 30, 1), block('c', 60)];
    expect(rightToLeft(START, 52, nested)).toMatchObject({ index: 2, indent: 0, lineStart: START });
    expect(rightToLeft(START - 30, 52, nested)).toMatchObject({ index: 2, indent: 1, lineStart: START - STEP });
    expect(rightToLeft(START - 2 * STEP + 5, 52, nested)).toMatchObject({ index: 2, indent: 2, lineStart: START - 2 * STEP });
    expect(rightToLeft(START + 3 * STEP, 52, nested)).toMatchObject({ index: 2, indent: 0, lineStart: START });
  });

  it('clamps the indent between 0 and one level below the block above, and keeps it at 0 at the top', () => {
    expect(target(START + 10 * STEP, 22, column)).toMatchObject({ index: 1, indent: 1 });
    expect(target(START - 3 * STEP, 22, column)).toMatchObject({ index: 1, indent: 0 });
    expect(target(START + 10 * STEP, 0, column)).toMatchObject({ index: 0, indent: 0, lineStart: START });
  });

  it('ignores the dragged blocks, counting gaps between the others', () => {
    const dragging = [block('a', 0), block('b', 30, 0, true), block('c', 60)];
    expect(target(START, 38, dragging)).toMatchObject({ index: 1, lineTop: 40 });
    expect(target(START + STEP, 38, dragging)).toMatchObject({ index: 1, indent: 1 });
    expect(target(START, 95, dragging)).toMatchObject({ index: 2, lineTop: 80 });
  });

  it('falls back to the top of the first block when every block is dragged', () => {
    expect(target(START, 50, [block('a', 10, 0, true)])).toEqual({ index: 0, indent: 0, lineTop: 10, lineStart: START });
  });
});
