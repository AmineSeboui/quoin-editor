import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { blockRangeSelection, type QuoinBlock } from '../../engine';
import { loadEmojiData } from './emoji-data';
import { emojiExtension } from './emoji-extension';
import { mountEmoji } from './emoji-test-canvas';

const PARTY_POPPER = '\u{1F389}';
const PIN = '\u{1F4CC}';

const callout = (id: string, data: Record<string, unknown> = {}): QuoinBlock => ({
  id,
  type: 'CALLOUT',
  data: { tone: 'info', body: 'Careful', ...data },
});

const picker = () => screen.queryByRole('dialog', { name: 'Choose icon' });
const field = () => screen.getByRole('textbox', { name: 'Search emoji' });
const chooseIcon = () => within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Choose icon' });

function setup(blocks: QuoinBlock[] = [paragraph('a', 'Intro'), callout('c', { icon: PIN }), paragraph('b', 'After')]) {
  const canvas = mountEmoji(blocks);
  const bodyHost = (id: string) => canvas.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const openMenuOn = (block: string) => {
    const region = blocks.find(({ id }) => id === block)?.type === 'CALLOUT' ? 'body' : 'text';
    act(() => canvas.handle().focus({ block, region, offset: 0 }));
    return canvas.openBlockMenu();
  };
  const openPicker = (block = 'c') => {
    openMenuOn(block);
    act(() => void fireEvent.click(chooseIcon()!));
  };
  const icon = (id: string) => (canvas.last() ?? canvas.handle().editor.getBlocks()).find((b) => b.id === id)?.data.icon;
  return { ...canvas, bodyHost, openMenuOn, openPicker, icon, user: userEvent.setup() };
}

describe('the icon picker of a callout', () => {
  beforeAll(() => loadEmojiData());

  it('is offered in the block menu of a callout only', () => {
    const { openMenuOn, press } = setup();
    openMenuOn('c');
    expect(chooseIcon()).not.toBeNull();
    press('Escape');
    openMenuOn('a');
    expect(chooseIcon()).toBeNull();
  });

  it('opens in place of the block menu with focus in its search, and writes the emoji picked to the icon in one undo step', async () => {
    const { openPicker, user, icon, bodyHost, undo } = setup();
    openPicker();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(picker()).not.toBeNull();
    await act(async () => {});
    expect(field()).toHaveFocus();
    await user.type(field(), 'tada');
    await user.keyboard('{Enter}');
    expect(picker()).toBeNull();
    expect(icon('c')).toBe(PARTY_POPPER);
    expect(bodyHost('c')).toHaveFocus();
    undo();
    expect(icon('c')).toBe(PIN);
  });

  it('picks with the grid as well, and closes on Escape, handing focus back to the callout and keeping its icon', async () => {
    const { openPicker, user, icon, bodyHost } = setup();
    openPicker();
    await act(async () => {});
    await user.keyboard('{Escape}');
    expect(picker()).toBeNull();
    expect(icon('c')).toBe(PIN);
    expect(bodyHost('c')).toHaveFocus();

    openPicker();
    await act(async () => {});
    await user.type(field(), 'smi');
    await user.tab();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(icon('c')).toBe('\u{1F604}');
  });

  it('closes on a press outside and leaves focus where the press puts it', async () => {
    const { openPicker, icon, container } = setup();
    openPicker();
    await act(async () => {});
    const outside = document.body.appendChild(document.createElement('input'));
    fireEvent.pointerDown(outside, { pointerType: 'mouse' });
    act(() => outside.focus());
    await act(() => new Promise((resolve) => setTimeout(resolve)));
    expect(picker()).toBeNull();
    expect(outside).toHaveFocus();
    expect(container.contains(document.activeElement)).toBe(false);
    expect(icon('c')).toBe(PIN);
    outside.remove();
  });

  it('writes the icon of every callout selected with the one the menu is for', async () => {
    const { handle, openBlockMenu, user, icon, undo } = setup([callout('c'), callout('d'), paragraph('b', 'After')]);
    act(() => {
      handle().controller.dispatch(handle().editor.createTransaction().setSelection(blockRangeSelection('c', 'd')));
      handle().focus();
    });
    openBlockMenu();
    act(() => void fireEvent.click(chooseIcon()!));
    await act(async () => {});
    await user.type(field(), 'tada');
    await user.keyboard('{Enter}');
    expect([icon('c'), icon('d')]).toEqual([PARTY_POPPER, PARTY_POPPER]);
    undo();
    expect([icon('c'), icon('d')]).toEqual([undefined, undefined]);
  });

  it('is not offered for a selection of a callout and a paragraph', () => {
    const { handle, openBlockMenu } = setup([callout('c'), paragraph('b', 'After')]);
    act(() => {
      handle().controller.dispatch(handle().editor.createTransaction().setSelection(blockRangeSelection('c', 'b')));
      handle().focus();
    });
    openBlockMenu();
    expect(chooseIcon()).toBeNull();
  });

  it('closes when its callout goes', async () => {
    const { openPicker, handle } = setup();
    openPicker();
    await act(async () => {});
    act(() => void handle().editor.setBlocks([paragraph('a', 'Intro')]));
    expect(picker()).toBeNull();
  });

  it('has no axe violations', async () => {
    const { openPicker, user } = setup();
    openPicker();
    await act(async () => {});
    await user.type(field(), 'heart');
    expect(await axe(picker()!)).toHaveNoViolations();
  });
});

describe('the icon picker on a read-only canvas', () => {
  beforeAll(() => loadEmojiData());

  it('is not offered, and closes once the canvas turns read-only', async () => {
    const ref = createRef<QuoinEditorHandle>();
    const extensions = [emojiExtension()];
    function Host({ readOnly }: { readOnly: boolean }) {
      const [blocks, setBlocks] = useState([callout('c')]);
      return (
        <BlockCanvas
          ref={ref}
          blocks={blocks}
          onChange={setBlocks}
          blockTypes={coreBlocks}
          extensions={extensions}
          readOnly={readOnly}
        />
      );
    }
    const { rerender } = render(<Host readOnly={false} />);
    act(() => ref.current!.focus({ block: 'c', region: 'body', offset: 0 }));
    const mod = ref.current!.controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(document.activeElement!, { key: '/', ...mod }));
    act(() => void fireEvent.click(chooseIcon()!));
    await act(async () => {});
    expect(picker()).not.toBeNull();
    rerender(<Host readOnly />);
    expect(picker()).toBeNull();
    act(() => ref.current!.focus({ block: 'c', region: 'body', offset: 0 }));
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: '/', ...mod }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Choose icon' })).toBeNull();
  });
});
