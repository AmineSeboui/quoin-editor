import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { textSelection, type Pos } from '../../engine';
import type { QuoinBlock } from '../../types';

type Canvas = ReturnType<typeof mountCanvas>;

const pos = (offset: number): Pos => ({ block: 'a', region: 'text', offset });
const host = (canvas: Canvas) => canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
const markdown = (canvas: Canvas) => canvas.last()?.map((block) => block.data.markdown);
const popover = () => screen.queryByRole('dialog', { name: 'Link' });
const field = () => screen.getByRole('textbox', { name: 'Link address' });
const control = (name: string) => within(popover()!).getByRole('button', { name });
// jsdom computes no pseudo-element styles, which the contrast check reads for a text field; Playwright checks contrast.
const audit = (element: Element) => act(() => axe(element, { rules: { 'color-contrast': { enabled: false } } }));

function openPopover(blocks: QuoinBlock[], anchor: Pos, head: Pos = anchor): Canvas {
  const canvas = mountCanvas(blocks);
  act(() => {
    const { controller } = canvas.handle();
    controller.focus(anchor);
    controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
  });
  fireEvent.keyDown(host(canvas), { key: 'k', code: 'KeyK', ctrlKey: true });
  return canvas;
}

async function enter(address: string) {
  const user = userEvent.setup();
  await user.clear(field());
  if (address !== '') await user.type(field(), address);
  await user.keyboard('{Enter}');
}

describe('the link popover', () => {
  it('opens on Mod+K with focus in an empty address field', () => {
    openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('');
    expect(within(popover()!).queryByRole('button', { name: 'Remove link' })).toBeNull();
  });

  it('links the selected text on Enter and gives focus back to the text with its selection', async () => {
    const canvas = openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    await enter('https://quoin.dev');
    expect(markdown(canvas)).toEqual(['[hello](https://quoin.dev) world']);
    expect(popover()).toBeNull();
    expect(host(canvas)).toHaveFocus();
    expect(canvas.selection()).toEqual(textSelection(pos(0), pos(5)));
  });

  it('applies from its Apply button as from Enter', async () => {
    const canvas = openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    await userEvent.setup().type(field(), 'https://quoin.dev');
    fireEvent.click(control('Apply link'));
    expect(markdown(canvas)).toEqual(['[hello](https://quoin.dev) world']);
  });

  it('edits the link around a collapsed caret, starting from its address and keeping its title', async () => {
    const canvas = openPopover([paragraph('a', 'see [docs](https://old.example "Docs") here')], pos(6));
    expect(field()).toHaveValue('https://old.example');
    await enter('https://new.example');
    expect(markdown(canvas)).toEqual(['see [docs](https://new.example "Docs") here']);
    expect(canvas.selection()).toEqual(textSelection(pos(6)));
  });

  it('inserts the address as linked text at a caret outside every link, then puts the caret after it', async () => {
    const canvas = openPopover([paragraph('a', 'see it')], pos(4));
    await enter('www.quoin.dev');
    expect(markdown(canvas)).toEqual(['see [www.quoin.dev](https://www.quoin.dev)it']);
    expect(canvas.selection()).toEqual(textSelection(pos(17)));
  });

  it.each([
    ['example.com', '[hello](https://example.com) world'],
    ['/docs', '[hello](/docs) world'],
    ['#top', '[hello](#top) world'],
  ])('completes a bare domain with https and keeps a relative address: %j', async (address, linked) => {
    const canvas = openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    await enter(address);
    expect(markdown(canvas)).toEqual([linked]);
  });

  it('removes the link with Remove link and gives focus back to the text', () => {
    const canvas = openPopover([paragraph('a', 'see [docs](https://old.example) here')], pos(6));
    fireEvent.click(control('Remove link'));
    expect(markdown(canvas)).toEqual(['see docs here']);
    expect(popover()).toBeNull();
    expect(host(canvas)).toHaveFocus();
  });

  it('offers to open the link it edits in a new tab', () => {
    openPopover([paragraph('a', 'see [docs](https://old.example) here')], pos(6));
    const open = within(popover()!).getByRole('link', { name: 'Open link' });
    expect(open).toHaveAttribute('href', 'https://old.example');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['javascript:alert(1)', '', '   '])('stays open and explains why it refuses %j', async (address) => {
    const canvas = openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    await enter(address);
    expect(popover()).not.toBeNull();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription('Enter a valid link, such as https://example.com');
    expect(canvas.changes).toHaveLength(0);
  });

  it('clears the explanation once the address changes', async () => {
    openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    await enter('javascript:alert(1)');
    await userEvent.setup().type(field(), 'x');
    expect(field()).not.toHaveAttribute('aria-invalid');
    expect(field()).not.toHaveAccessibleDescription();
  });

  it('closes on Escape and gives focus back to the text with the selection it had', async () => {
    const canvas = openPopover([paragraph('a', 'hello world')], pos(0), pos(5));
    const user = userEvent.setup();
    await user.type(field(), 'https://quoin.dev');
    await user.keyboard('{Escape}');
    expect(popover()).toBeNull();
    expect(host(canvas)).toHaveFocus();
    expect(canvas.selection()).toEqual(textSelection(pos(0), pos(5)));
    expect(canvas.changes).toHaveLength(0);
  });

  it('stays closed after the canvas turns read-only and back, and leaves focus where it is', () => {
    const ref = createRef<QuoinEditorHandle>();
    const blocks = [paragraph('a', 'hello world')];
    const draw = (readOnly: boolean) => <BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} readOnly={readOnly} />;
    const { container, rerender } = render(draw(false));
    act(() => {
      const { controller } = ref.current!;
      controller.focus(pos(0));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(0), pos(5))));
    });
    fireEvent.keyDown(container.querySelector('[data-quoin-host]')!, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(field()).toHaveFocus();
    rerender(draw(true));
    expect(popover()).toBeNull();
    const focused = document.activeElement;
    rerender(draw(false));
    expect(popover()).toBeNull();
    expect(document.activeElement).toBe(focused);
  });

  it('opens from the Link button of the formatting toolbar', () => {
    const canvas = mountCanvas([paragraph('a', 'hello world')]);
    act(() => {
      const { controller } = canvas.handle();
      controller.focus(pos(0));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos(0), pos(5))));
    });
    fireEvent.click(within(screen.getByRole('toolbar', { name: 'Text formatting' })).getByRole('button', { name: 'Link' }));
    expect(field()).toHaveFocus();
  });

  it('has no accessibility violations, with or without its explanation', async () => {
    openPopover([paragraph('a', 'see [docs](https://old.example) here')], pos(6));
    expect(await audit(popover()!)).toHaveNoViolations();
    await enter('javascript:alert(1)');
    expect(await audit(popover()!)).toHaveNoViolations();
  });
});
