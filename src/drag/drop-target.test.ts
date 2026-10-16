import { describe, expect, it } from 'vitest';
import { computeDropTarget } from './drop-target';

const STEP = 24;
const LEFT = 100;

const block = (id: string, top: number, indent = 0, dragged = false) => ({
  id,
  top,
  bottom: top + 20,
  left: LEFT,
  indent,
  dragged,
});

const target = (pointerX: number, pointerY: number, blocks: ReturnType<typeof block>[]) =>
  computeDropTarget({ pointerX, pointerY, blocks, indentStep: STEP });

describe('computeDropTarget', () => {
  const column = [block('a', 0), block('b', 30), block('c', 60)];

  it('picks the gap whose midpoint is nearest the pointer', () => {
    expect(target(LEFT, 2, column)).toMatchObject({ index: 0, lineTop: 0 });
    expect(target(LEFT, 22, column)).toMatchObject({ index: 1, lineTop: 25 });
    expect(target(LEFT, 47, column)).toMatchObject({ index: 2, lineTop: 55 });
    expect(target(LEFT, 400, column)).toMatchObject({ index: 3, lineTop: 80 });
    expect(target(LEFT, -50, column)).toMatchObject({ index: 0, lineTop: 0 });
  });

  it('takes the indent from how far right of the block above the pointer is', () => {
    const nested = [block('a', 0), block('b', 30, 1), block('c', 60)];
    expect(target(LEFT, 52, nested)).toMatchObject({ index: 2, indent: 0, lineLeft: LEFT });
    expect(target(LEFT + 30, 52, nested)).toMatchObject({ index: 2, indent: 1, lineLeft: LEFT + STEP });
    expect(target(LEFT + 2 * STEP - 5, 52, nested)).toMatchObject({ index: 2, indent: 2, lineLeft: LEFT + 2 * STEP });
  });

  it('clamps the indent between 0 and one level below the block above, and keeps it at 0 at the top', () => {
    expect(target(LEFT + 10 * STEP, 22, column)).toMatchObject({ index: 1, indent: 1 });
    expect(target(LEFT - 3 * STEP, 22, column)).toMatchObject({ index: 1, indent: 0 });
    expect(target(LEFT + 10 * STEP, 0, column)).toMatchObject({ index: 0, indent: 0, lineLeft: LEFT });
  });

  it('ignores the dragged blocks, counting gaps between the others', () => {
    const dragging = [block('a', 0), block('b', 30, 0, true), block('c', 60)];
    expect(target(LEFT, 38, dragging)).toMatchObject({ index: 1, lineTop: 40 });
    expect(target(LEFT + STEP, 38, dragging)).toMatchObject({ index: 1, indent: 1 });
    expect(target(LEFT, 95, dragging)).toMatchObject({ index: 2, lineTop: 80 });
  });

  it('falls back to the top of the first block when every block is dragged', () => {
    expect(target(LEFT, 50, [block('a', 10, 0, true)])).toEqual({ index: 0, indent: 0, lineTop: 10, lineLeft: LEFT });
  });
});
