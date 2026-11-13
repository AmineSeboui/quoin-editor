import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { textSelection } from '../../engine';
import { mountCanvas, paragraph } from '../../blocks/test-support/test-canvas';
import type { InlineDirection } from '../../ui/direction';
import { tableExtension } from './table-extension';
import { COL, layOutTable } from './test-layout';
import { at, table } from './test-table';

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  vi.restoreAllMocks();
});

describe('ArrowUp into a table from the block below it', () => {
  it.each<[InlineDirection, number]>([
    ['ltr', 0],
    ['rtl', 1],
  ])('on a %s page lands in the column drawn under the caret, column %i', (direction, col) => {
    document.documentElement.setAttribute('dir', direction);
    layOutTable(direction);
    const empty = table({ rows: [['', ''], ['', '']] });
    const { handle, press, selection } = mountCanvas([empty, paragraph('q', '')], { extensions: [tableExtension()] });
    act(() => handle().focus({ block: 'q', region: 'text', offset: 0 }));
    handle().controller.goalX = COL / 2;
    press('ArrowUp');
    expect(selection()).toEqual(textSelection(at(1, col)));
  });
});
