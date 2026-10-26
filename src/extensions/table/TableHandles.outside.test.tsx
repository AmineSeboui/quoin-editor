import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Command } from '../../engine';
import { addRow, moveColumn, moveRow, setColumnAlign } from '../../engine/commands/table-commands';
import { cellKey } from '../../engine/blocks/table-spec';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import { text } from '../../engine/model/inline';
import { mount, press } from './test-table';

type Mounted = ReturnType<typeof mount>;

const remotely = ({ handle }: Mounted, command: Command) =>
  act(() => {
    const { editor } = handle();
    command(editor.state, (tr) => editor.dispatch(tr.setOrigin('remote')));
  });

const typeRemotely = ({ handle }: Mounted, row: number, col: number, value: string) =>
  act(() => {
    const { editor } = handle();
    editor.dispatch(editor.createTransaction().setOrigin('remote').step(replaceInlineStep('t', cellKey(row, col), 0, 0, [text(value)])));
  });

const menu = (name: string) => screen.queryByRole('menu', { name });

afterEach(() => (document.activeElement as HTMLElement | null)?.blur());

describe('the menu of a row or a column, when a change from outside reaches the table', () => {
  it('closes once the row it was opened for moves, and stays open while that row stays put', () => {
    const mounted = mount();
    mounted.caretIn(1, 0);
    press('Row 2 options');
    typeRemotely(mounted, 2, 0, 'c');
    expect(menu('Row 2 options')).not.toBeNull();
    remotely(mounted, addRow('t', 0));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(mounted.dataOf().rows).toEqual([['', ''], ['Name', 'Size'], ['a', '2'], ['cb', '3']]);
  });

  it('closes once the column it was opened for moves, and stays open while that column only aligns', () => {
    const mounted = mount();
    mounted.caretIn(1, 1);
    press('Column 2 options');
    remotely(mounted, setColumnAlign('t', 1, 'right'));
    expect(menu('Column 2 options')).not.toBeNull();
    remotely(mounted, moveColumn('t', 1, 0));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open while a collaborator types in the row it was opened for, and closes once that row moves', () => {
    const mounted = mount();
    mounted.caretIn(1, 0);
    press('Row 2 options');
    typeRemotely(mounted, 1, 0, 'x');
    typeRemotely(mounted, 2, 1, 'y');
    typeRemotely(mounted, 1, 1, 'z');
    expect(menu('Row 2 options')).not.toBeNull();
    remotely(mounted, moveRow('t', 1, 2));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open while a collaborator types in the column it was opened for, and closes once that column moves', () => {
    const mounted = mount();
    mounted.caretIn(1, 1);
    press('Column 2 options');
    typeRemotely(mounted, 2, 1, 'x');
    expect(menu('Column 2 options')).not.toBeNull();
    remotely(mounted, moveColumn('t', 1, 0));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
