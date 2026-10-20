import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { textSelection } from '../../engine';
import { paragraph } from '../../blocks/void/test-canvas';
import { mountEmbeds, YOUTUBE } from './embed-test-canvas';

const options = () => screen.queryByRole('toolbar', { name: 'Link options' });
const choices = () => within(options()!).getAllByRole('button').map((button) => button.textContent);
const choice = (name: string) => within(options()!).getByRole('button', { name });
const link = (url: string) => paragraph('a', `<${url}>`);

function pasted(url = YOUTUBE) {
  const canvas = mountEmbeds([paragraph('a', '')]);
  canvas.caret('a');
  canvas.paste(url);
  const host = canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
  const lines = () => canvas.last().map((block) => block.type);
  return { ...canvas, host, lines };
}

function pressOn(target: Element) {
  const down = Object.assign(new Event('pointerdown', { bubbles: true, cancelable: true }), { pointerType: 'mouse', button: 0 });
  act(() => void target.dispatchEvent(down));
}

describe('a link pasted alone on an empty line', () => {
  it('is offered as an embed, a bookmark or a link, while the caret stays in the text', () => {
    const { host, last, selection } = pasted();
    expect(last()[1]).toEqual(link(YOUTUBE));
    expect(choices()).toEqual(['Embed', 'Bookmark', 'Keep as link']);
    expect(document.activeElement).toBe(host);
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: YOUTUBE.length }));
  });

  it('is offered no embed when no provider frames it', () => {
    pasted('https://example.com/page');
    expect(choices()).toEqual(['Bookmark', 'Keep as link']);
  });

  it('becomes an embed above the emptied line, which keeps the caret, and undo brings the link line back', () => {
    const { last, lines, handle, host } = pasted();
    act(() => void fireEvent.click(choice('Embed')));
    expect(lines()).toEqual(['MARKDOWN', 'EMBED', 'MARKDOWN', 'MARKDOWN']);
    expect(last()[1].data).toEqual({ url: YOUTUBE, provider: 'youtube' });
    expect(last()[2]).toEqual(paragraph('a', ''));
    expect(document.activeElement).toBe(host);
    expect(options()).toBeNull();
    act(() => void handle().editor.commands.undo());
    expect(last()[1]).toEqual(link(YOUTUBE));
    expect(lines()).toEqual(['MARKDOWN', 'MARKDOWN', 'MARKDOWN']);
    expect(options()).toBeNull();
  });

  it('becomes a bookmark above the emptied line', () => {
    const { last, lines } = pasted('https://example.com/page');
    act(() => void fireEvent.click(choice('Bookmark')));
    expect(lines()).toEqual(['MARKDOWN', 'BOOKMARK', 'MARKDOWN', 'MARKDOWN']);
    expect(last()[1].data).toEqual({ url: 'https://example.com/page' });
  });

  it('stays a link on Keep as link, Escape in the text, a key typed or the caret moved', () => {
    const kept = pasted();
    act(() => void fireEvent.click(choice('Keep as link')));
    expect(options()).toBeNull();
    expect(kept.last()[1]).toEqual(link(YOUTUBE));
    expect(document.activeElement).toBe(kept.host);

    const escaped = pasted();
    escaped.key('Escape');
    expect(options()).toBeNull();
    expect(escaped.selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: YOUTUBE.length }));
    escaped.key('Escape');
    expect(escaped.selection()).not.toEqual(textSelection({ block: 'a', region: 'text', offset: YOUTUBE.length }));

    const typed = pasted();
    act(() => void typed.handle().editor.insertText(' '));
    expect(options()).toBeNull();

    const moved = pasted();
    moved.caret('q');
    expect(options()).toBeNull();
  });

  it('closes on a press outside, keeping the link, and moves no focus', () => {
    const { last, host } = pasted();
    const outside = document.body.appendChild(document.createElement('div'));
    pressOn(outside);
    expect(options()).toBeNull();
    expect(last()[1]).toEqual(link(YOUTUBE));
    expect(document.activeElement).toBe(host);
    outside.remove();
  });

  it('is reached with Alt+F10, walked with the arrows, and left with Escape, which keeps the link', () => {
    const { key, host, last } = pasted();
    key('F10', { altKey: true });
    expect(document.activeElement).toBe(choice('Embed'));
    key('ArrowRight');
    expect(document.activeElement).toBe(choice('Bookmark'));
    key('End');
    expect(document.activeElement).toBe(choice('Keep as link'));
    key('Escape');
    expect(document.activeElement).toBe(host);
    expect(options()).toBeNull();
    expect(last()[1]).toEqual(link(YOUTUBE));
  });

  it('takes a choice made with the keyboard, then gives focus back to the text', () => {
    const { key, lines, host } = pasted();
    key('F10', { altKey: true });
    key('ArrowRight');
    act(() => void fireEvent.click(document.activeElement!));
    expect(lines()).toEqual(['MARKDOWN', 'BOOKMARK', 'MARKDOWN', 'MARKDOWN']);
    expect(document.activeElement).toBe(host);
  });

  it('is gone once the canvas is read-only', () => {
    const { handle } = pasted();
    act(() => handle().controller.setReadOnly(true));
    expect(options()).toBeNull();
  });

  it('has no accessibility violations', async () => {
    pasted();
    await act(async () => {});
    expect(await axe(options()!)).toHaveNoViolations();
  });
});
