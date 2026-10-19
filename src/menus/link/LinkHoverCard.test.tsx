import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { textSelection, type Pos } from '../../engine';

type Canvas = ReturnType<typeof mountCanvas>;

const LONG = `https://example.com/${'a'.repeat(40)}/end.html`;
const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const host = (canvas: Canvas) => canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
const anchor = (canvas: Canvas) => host(canvas).querySelector<HTMLAnchorElement>('a[data-quoin-link]')!;
const markdown = (canvas: Canvas) => canvas.last()?.map((block) => block.data.markdown);
const card = () => screen.queryByRole('dialog', { name: 'Link' });
const control = (name: string) => within(card()!).getByRole('button', { name });
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

// jsdom has no PointerEvent, so the pointer type is set on a plain event.
function pointerOver(target: Element, pointerType = 'mouse') {
  const event = Object.assign(new Event('pointerover', { bubbles: true }), { pointerType, buttons: 0 });
  act(() => void target.dispatchEvent(event));
}

function mount(markdownText = 'see [docs](https://quoin.dev/docs) here', props = {}) {
  return mountCanvas([paragraph('a', markdownText)], props);
}

function placeCaret(canvas: Canvas, offset: number) {
  act(() => canvas.handle().controller.focus(pos(offset)));
}

beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => void vi.useRealTimers());

describe('the link hover card at the caret', () => {
  it('shows the address and its actions once the caret has rested in a link for 300 ms, leaving focus alone', () => {
    const canvas = mount();
    placeCaret(canvas, 6);
    wait(299);
    expect(card()).toBeNull();
    wait(1);
    expect(card()).toHaveTextContent('https://quoin.dev/docs');
    const open = within(card()!).getByRole('link', { name: 'Open link' });
    expect(open).toHaveAttribute('href', 'https://quoin.dev/docs');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(control('Edit link')).toBeInTheDocument();
    expect(control('Remove link')).toBeInTheDocument();
    expect(host(canvas)).toHaveFocus();
  });

  it('hides as soon as the caret leaves the link', () => {
    const canvas = mount();
    placeCaret(canvas, 6);
    wait(300);
    placeCaret(canvas, 1);
    expect(card()).toBeNull();
  });

  it('stays away from a range of selected text', () => {
    const canvas = mount();
    act(() => {
      const { controller } = canvas.handle();
      controller.focus(pos(5));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(5), pos(7))));
    });
    wait(300);
    expect(card()).toBeNull();
  });

  it('middle-truncates a long address to 48 characters', () => {
    const canvas = mount(`see [docs](${LONG}) here`);
    placeCaret(canvas, 6);
    wait(300);
    expect(card()).toHaveTextContent(`${LONG.slice(0, 24)}…${LONG.slice(-23)}`);
  });

  it('removes the link with Remove link, keeping the caret and focus in the text', () => {
    const canvas = mount();
    placeCaret(canvas, 6);
    wait(300);
    fireEvent.click(control('Remove link'));
    expect(markdown(canvas)).toEqual(['see docs here']);
    expect(card()).toBeNull();
    expect(canvas.selection()).toEqual(textSelection(pos(6)));
    expect(host(canvas)).toHaveFocus();
  });

  it('opens the link popover on the link with Edit link', () => {
    const canvas = mount();
    placeCaret(canvas, 6);
    wait(300);
    fireEvent.click(control('Edit link'));
    expect(screen.getByRole('textbox', { name: 'Link address' })).toHaveValue('https://quoin.dev/docs');
    expect(canvas.selection()).toEqual(textSelection(pos(6)));
  });

  it('has no accessibility violations', async () => {
    const canvas = mount();
    placeCaret(canvas, 6);
    wait(300);
    vi.useRealTimers();
    expect(await act(() => axe(card()!))).toHaveNoViolations();
  });

  it('never shows in a read-only canvas', () => {
    const canvas = mount(undefined, { readOnly: true });
    placeCaret(canvas, 6);
    pointerOver(anchor(canvas));
    wait(300);
    expect(card()).toBeNull();
  });
});

describe('the link hover card under the pointer', () => {
  it('shows once the pointer has rested on a link for 300 ms and hides 300 ms after it leaves', () => {
    const canvas = mount();
    pointerOver(anchor(canvas));
    wait(299);
    expect(card()).toBeNull();
    wait(1);
    expect(card()).toHaveTextContent('https://quoin.dev/docs');
    pointerOver(host(canvas));
    wait(299);
    expect(card()).not.toBeNull();
    wait(1);
    expect(card()).toBeNull();
  });

  it('stays while the pointer moves from the link onto the card', () => {
    const canvas = mount();
    pointerOver(anchor(canvas));
    wait(300);
    pointerOver(host(canvas));
    wait(200);
    pointerOver(card()!);
    wait(300);
    expect(card()).not.toBeNull();
  });

  it('ignores a touch, which has no pointer resting anywhere', () => {
    const canvas = mount();
    pointerOver(anchor(canvas), 'touch');
    wait(300);
    expect(card()).toBeNull();
  });

  it('removes the hovered link and leaves the selection where it was', () => {
    const canvas = mount();
    placeCaret(canvas, 1);
    pointerOver(anchor(canvas));
    wait(300);
    fireEvent.click(control('Remove link'));
    expect(markdown(canvas)).toEqual(['see docs here']);
    expect(canvas.selection()).toEqual(textSelection(pos(1)));
    expect(card()).toBeNull();
  });

  it('selects the hovered link to edit it in the popover', () => {
    const canvas = mount();
    placeCaret(canvas, 1);
    pointerOver(anchor(canvas));
    wait(300);
    fireEvent.click(control('Edit link'));
    expect(canvas.selection()).toEqual(textSelection(pos(4), pos(8)));
    expect(screen.getByRole('textbox', { name: 'Link address' })).toHaveValue('https://quoin.dev/docs');
  });
});
