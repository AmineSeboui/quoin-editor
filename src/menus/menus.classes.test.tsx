import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { textSelection, type Pos } from '../engine';
import type { QuoinBlock } from '../types';
import { classLists } from '../ui/test-class-lists';

type Canvas = ReturnType<typeof mountCanvas>;

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const host = (canvas: Canvas) => canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
const toolbar = () => screen.getByRole('toolbar', { name: 'Text formatting' });

function select(canvas: Canvas, anchor: number, head = anchor) {
  act(() => {
    const { controller } = canvas.handle();
    controller.focus(pos(anchor));
    controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(anchor), pos(head))));
  });
}

function type(text: string) {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

const mount = (markdown: string, more: QuoinBlock[] = []) => mountCanvas([paragraph('a', markdown), ...more]);

describe('the classes Quoin gives its floating menus', () => {
  it('in the bubble toolbar', () => {
    select(mount('hello world'), 0, 5);
    expect(classLists(toolbar())).toMatchSnapshot();
  });

  it.each(['Turn into', 'Color', 'Align'])('in the %s menu of the bubble toolbar', async (control) => {
    const user = userEvent.setup();
    select(mount('hello world'), 0, 5);
    await user.click(within(toolbar()).getByRole('button', { name: control }));
    expect(classLists(...screen.getAllByRole('menu'))).toMatchSnapshot();
  });

  it('in the link popover', () => {
    const canvas = mount('hello world');
    select(canvas, 0, 5);
    fireEvent.keyDown(host(canvas), { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(classLists(screen.getByRole('dialog', { name: 'Link' }))).toMatchSnapshot();
  });

  it('in the link hover card', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      select(mount('see [docs](https://quoin.dev/docs) here'), 6);
      act(() => void vi.advanceTimersByTime(300));
      expect(classLists(screen.getByRole('dialog', { name: 'Link' }))).toMatchSnapshot();
    } finally {
      vi.useRealTimers();
    }
  });

  it('in the slash menu', () => {
    select(mount(''), 0);
    type('/');
    const listbox = screen.getByRole('listbox', { name: 'Commands' });
    expect(classLists(listbox.closest('[data-slot="popover-content"]')!)).toMatchSnapshot();
  });

  it('in the language list of a code block', () => {
    mount('', [{ id: 'k', type: 'CODE', data: { language: 'ts', code: 'x' } }]);
    act(() => screen.getByRole('combobox', { name: 'Language' }).focus());
    const listbox = screen.getByRole('listbox', { name: 'Language' });
    expect(classLists(listbox.closest('[data-slot="popover-content"]')!)).toMatchSnapshot();
  });
});
