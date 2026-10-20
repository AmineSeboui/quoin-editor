import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { textSelection } from '../../engine';
import { paragraph } from '../../blocks/void/test-canvas';
import { mountEmbeds, YOUTUBE } from './embed-test-canvas';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

const field = (name: string) => screen.queryByRole('textbox', { name });

afterEach(() => document.querySelectorAll('[data-outside]').forEach((element) => element.remove()));
const afterTimers = () => act(() => new Promise((done) => setTimeout(done, 0)));

function asked(command: '/embed' | '/bookmark') {
  const canvas = mountEmbeds([paragraph('a', '')]);
  const after = document.body.appendChild(document.createElement('input'));
  after.setAttribute('aria-label', 'After');
  after.setAttribute('data-outside', '');
  canvas.caret('a');
  type(command);
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  const host = (id: string) => canvas.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const lines = () => (canvas.changes.length === 0 ? [] : canvas.last().map((block) => block.type));
  return { ...canvas, host, lines, user: userEvent.setup() };
}

describe('the Embed command of the slash menu', () => {
  it('asks for a link, which Enter embeds above the line, giving focus back to the line', async () => {
    const { user, last, lines, host, selection } = asked('/embed');
    expect(field('Link to embed')).toHaveFocus();
    await user.type(field('Link to embed')!, `${YOUTUBE}{Enter}`);
    expect(lines()).toEqual(['MARKDOWN', 'EMBED', 'MARKDOWN', 'MARKDOWN']);
    expect(last()[1].data).toEqual({ url: YOUTUBE, provider: 'youtube' });
    expect(field('Link to embed')).toBeNull();
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 0 }));
    expect(document.activeElement).toBe(host('a'));
  });

  it('asks no more on Escape, giving focus back where the slash was', async () => {
    const { user, last, host } = asked('/embed');
    await user.type(field('Link to embed')!, `${YOUTUBE}{Escape}`);
    expect(field('Link to embed')).toBeNull();
    expect(last().map((block) => block.type)).toEqual(['MARKDOWN', 'MARKDOWN', 'MARKDOWN']);
    expect(document.activeElement).toBe(host('a'));
  });

  it('refuses what is no web address with a message', async () => {
    const { user, lines } = asked('/embed');
    await user.type(field('Link to embed')!, 'not a link{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a web address');
    expect(field('Link to embed')).toHaveAttribute('aria-invalid', 'true');
    expect(lines()).not.toContain('EMBED');
  });

  it('refuses a link no provider frames, with a message that offers a bookmark instead', async () => {
    const { user, last, lines, host } = asked('/embed');
    await user.type(field('Link to embed')!, 'example.com/page{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('This link cannot be embedded.');
    await user.click(screen.getByRole('button', { name: 'Bookmark instead' }));
    expect(lines()).toEqual(['MARKDOWN', 'BOOKMARK', 'MARKDOWN', 'MARKDOWN']);
    expect(last()[1].data).toEqual({ url: 'https://example.com/page' });
    expect(document.activeElement).toBe(host('a'));
  });

  it('stores a valid link on a press outside, leaving focus where the press puts it', async () => {
    const { user, last, lines } = asked('/embed');
    await user.type(field('Link to embed')!, YOUTUBE);
    const outside = screen.getByRole('textbox', { name: 'After' });
    await user.click(outside);
    await afterTimers();
    expect(field('Link to embed')).toBeNull();
    expect(lines()).toContain('EMBED');
    expect(last().find((block) => block.type === 'EMBED')?.data.url).toBe(YOUTUBE);
    expect(outside).toHaveFocus();
  });

  it('stores the link after the line on a press in the text elsewhere, where the caret stays', async () => {
    const { user, lines, host, selection } = asked('/embed');
    await user.type(field('Link to embed')!, YOUTUBE);
    await user.click(host('q'));
    await afterTimers();
    expect(lines()).toEqual(['MARKDOWN', 'MARKDOWN', 'EMBED', 'MARKDOWN']);
    expect(selection()).toMatchObject({ head: { block: 'q' } });
    expect(host('q')).toHaveFocus();
  });

  it('cancels on a press outside when the link is not valid', async () => {
    const { user, changes } = asked('/embed');
    await user.type(field('Link to embed')!, 'example.com');
    await user.click(screen.getByRole('textbox', { name: 'After' }));
    await afterTimers();
    expect(field('Link to embed')).toBeNull();
    expect(changes.at(-1)?.some((block) => block.type === 'EMBED' || block.type === 'BOOKMARK')).toBe(false);
  });

  it('has no accessibility violations, with or without its message', async () => {
    const { user } = asked('/embed');
    const dialog = () => field('Link to embed')!.closest('[role="dialog"]')!;
    await act(async () => {});
    expect(await axe(dialog())).toHaveNoViolations();
    await user.type(field('Link to embed')!, 'example.com{Enter}');
    await act(async () => {});
    expect(await axe(dialog())).toHaveNoViolations();
  });
});

describe('the Bookmark command of the slash menu', () => {
  it('asks for a link, which Enter bookmarks above the line', async () => {
    const { user, last, lines } = asked('/bookmark');
    await user.type(field('Link to bookmark')!, 'quoin.dev{Enter}');
    expect(lines()).toEqual(['MARKDOWN', 'BOOKMARK', 'MARKDOWN', 'MARKDOWN']);
    expect(last()[1].data).toEqual({ url: 'https://quoin.dev' });
  });
});
