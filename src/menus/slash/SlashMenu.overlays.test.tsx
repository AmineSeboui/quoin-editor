import { act, fireEvent, screen } from '@testing-library/react';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function openSlashMenu() {
  const canvas = mountCanvas([paragraph('a', 'First')]);
  act(() => canvas.handle().focus('end'));
  type(' /x');
  const host = canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
  const mod = canvas.handle().controller.isMac ? 'metaKey' : 'ctrlKey';
  const press = (key: string) => act(() => void fireEvent.keyDown(host, { key, [mod]: true }));
  return { ...canvas, press };
}

const listbox = () => screen.queryByRole('listbox', { name: 'Commands' });

// React reports a flushSync run while it is committing, which a dismiss dispatched from inside the commit would be.
const consoleErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => vi.restoreAllMocks());

describe('an overlay opened by key while the slash menu is open', () => {
  it('is the link popover for Mod+K, which keeps focus while the slash menu closes', async () => {
    const { press } = openSlashMenu();
    expect(listbox()).not.toBeNull();
    const errors = consoleErrors();
    press('k');
    await act(async () => {});
    expect(screen.getByRole('textbox', { name: 'Link address' })).toHaveFocus();
    expect(listbox()).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });

  it('is the block menu for Mod+/, which keeps focus while the slash menu closes', async () => {
    const { press } = openSlashMenu();
    const errors = consoleErrors();
    press('/');
    await act(async () => {});
    expect(screen.getByRole('menu').contains(document.activeElement)).toBe(true);
    expect(listbox()).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });
});
