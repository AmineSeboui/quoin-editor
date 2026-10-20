import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nodeSelection } from '../../engine';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph } from '../void/test-canvas';

const area = () => within(screen.getByRole('group', { name: 'Code' })).getByRole<HTMLTextAreaElement>('textbox', { name: 'Code' });

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function writeIn(blocks: QuoinBlock[], block: string, offset: number) {
  const canvas = mountCanvas(blocks);
  act(() => canvas.handle().focus({ block, region: 'text', offset }));
  return canvas;
}

describe('a block that becomes a code block', () => {
  it('takes the caret into its code after the fence and Enter', () => {
    const { last, selection } = writeIn([paragraph('a', '')], 'a', 0);
    type('```ts');
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(last()).toEqual([{ id: 'a', type: 'CODE', data: { language: 'ts', code: '' } }]);
    expect(selection()).toEqual(nodeSelection('a'));
    expect(document.activeElement).toBe(area());
  });

  it('takes the caret into its code after the fence and a space', () => {
    const { last } = writeIn([paragraph('a', '')], 'a', 0);
    type('```py ');
    expect(last()[0]).toMatchObject({ type: 'CODE', data: { language: 'py' } });
    expect(document.activeElement).toBe(area());
  });

  it('takes the caret into its code, after the text it kept, when turned into code from the block menu', async () => {
    const user = userEvent.setup();
    const { last } = writeIn([paragraph('a', 'let a;')], 'a', 0);
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Turn into' }));
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Code' })));
    expect(last()[0]).toMatchObject({ type: 'CODE', data: { code: 'let a;' } });
    expect(document.activeElement).toBe(area());
    expect(area().selectionStart).toBe(6);
  });
});

describe('a printable key on a selected code block', () => {
  it('goes into its code instead of replacing the block', () => {
    const { last, nodeSelect, press } = mountCanvas([paragraph('a', 'above'), { id: 'k', type: 'CODE', data: { language: 'ts', code: 'let a;' } }]);
    nodeSelect('k');
    press('Q');
    expect(last()[1]).toEqual({ id: 'k', type: 'CODE', data: { language: 'ts', code: 'let a;Q' } });
    expect(document.activeElement).toBe(area());
    expect(area().selectionStart).toBe(7);
  });

  it('leaves a shortcut with Mod to the editor', () => {
    const { changes, nodeSelect, handle } = mountCanvas([{ id: 'k', type: 'CODE', data: { language: 'ts', code: 'x' } }]);
    nodeSelect('k');
    const mod = handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'b', ...mod }));
    expect(changes).toEqual([]);
    expect(document.activeElement).not.toBe(area());
  });
});
