import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { nodeSelection, type EmbedProvider } from '../../engine';
import { embedBlock, mountEmbeds, YOUTUBE, YOUTUBE_FRAME } from './embed-test-canvas';

const frame = (title = 'YouTube video') => screen.getByTitle(title);
const cover = (shell: HTMLElement) => shell.querySelector('.quoin-embed-cover');

function press(target: Element) {
  const down = Object.assign(new Event('pointerdown', { bubbles: true, cancelable: true }), { pointerType: 'mouse', button: 0 });
  act(() => {
    target.dispatchEvent(down);
    fireEvent.mouseDown(target, { button: 0 });
  });
}

describe('an embed', () => {
  it('frames the page of a provider in a sandboxed frame named after the provider', () => {
    mountEmbeds([embedBlock(YOUTUBE)]);
    const youtube = frame();
    expect(youtube.tagName).toBe('IFRAME');
    expect(youtube).toHaveAttribute('src', YOUTUBE_FRAME);
    expect(youtube).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
    expect(youtube).toHaveAttribute('loading', 'lazy');
    expect(youtube).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(screen.getByRole('group', { name: 'Embed' })).toContainElement(youtube);
  });

  it('draws a player at its own height, and any other frame at the ratio of a video', () => {
    mountEmbeds([
      embedBlock(YOUTUBE),
      embedBlock('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', 's'),
      embedBlock('https://soundcloud.com/forss/flickermood', 'c'),
    ]);
    const box = (title: string) => frame(title).parentElement!;
    expect(box('YouTube video').style.height).toBe('');
    expect(box('Spotify player').style.height).toBe('352px');
    expect(box('SoundCloud player').style.height).toBe('166px');
  });

  it('is framed by a host provider before the built-in ones, named by the labels', () => {
    const acme: EmbedProvider = { name: 'acme', match: (url) => (url.hostname === 'youtu.be' ? 'https://embed.acme.test/1' : null) };
    mountEmbeds([embedBlock('https://youtu.be/dQw4w9WgXcQ')], {
      providers: [acme],
      labels: { frameTitle: (name) => `Lecteur ${name}` },
    });
    expect(frame('Lecteur acme')).toHaveAttribute('src', 'https://embed.acme.test/1');
  });

  it('is a card linking to its address, with no frame, when no provider frames it', () => {
    mountEmbeds([embedBlock('https://www.example.com/page?x=1')]);
    const card = screen.getByRole('group', { name: 'Embed' });
    expect(card.querySelector('iframe')).toBeNull();
    const link = within(card).getByRole('link', { name: 'https://www.example.com/page?x=1' });
    expect(link).toHaveAttribute('href', 'https://www.example.com/page?x=1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(card).toHaveTextContent('example.com');
  });

  it('is a card with no link and no frame for an address that is a script', () => {
    mountEmbeds([embedBlock('javascript:alert(1)')]);
    const card = screen.getByRole('group', { name: 'Embed' });
    expect(card.querySelector('iframe, a')).toBeNull();
    expect(card).toHaveTextContent('javascript:alert(1)');
  });
});

describe('an embed on an editable canvas', () => {
  it('keeps its frame out of the tab order, under a cover a press selects the block through', () => {
    const { shell, selection, sink } = mountEmbeds([embedBlock(YOUTUBE)]);
    expect(frame()).toHaveAttribute('tabindex', '-1');
    const over = cover(shell('e'))!;
    expect(over).toHaveAttribute('aria-hidden', 'true');
    press(over);
    expect(selection()).toEqual(nodeSelection('e'));
    expect(cover(shell('e'))).toBe(over);
    act(() => void fireEvent.click(over));
    expect(document.activeElement).toBe(sink());
    expect(cover(shell('e'))).toBeNull();
  });

  it('lifts the cover while the block is selected as a whole, and puts it back once it is not', () => {
    const { shell, caret, key, selection } = mountEmbeds([embedBlock(YOUTUBE)]);
    caret('p', 5);
    key('ArrowRight');
    expect(selection()).toEqual(nodeSelection('e'));
    expect(cover(shell('e'))).toBeNull();
    key('ArrowRight');
    expect(selection()).not.toEqual(nodeSelection('e'));
    expect(cover(shell('e'))).not.toBeNull();
  });

  it('moves focus into the frame on Enter while selected as a whole, once the key is handled', async () => {
    const { nodeSelect, key, changes } = mountEmbeds([embedBlock(YOUTUBE)]);
    nodeSelect('e');
    key('Enter');
    await act(() => new Promise((done) => setTimeout(done)));
    expect(document.activeElement).toBe(frame());
    expect(changes).toEqual([]);
  });

  it('has no accessibility violations', async () => {
    const { container } = mountEmbeds([embedBlock(YOUTUBE), embedBlock('https://www.example.com/', 'x')]);
    expect(await axe(container, { iframes: false })).toHaveNoViolations();
  });
});

describe('an embed on a read-only canvas', () => {
  it('has no cover, and its frame keeps its place in the tab order', async () => {
    const { container, shell } = mountEmbeds([embedBlock(YOUTUBE)], {}, { readOnly: true });
    expect(cover(shell('e'))).toBeNull();
    expect(frame()).not.toHaveAttribute('tabindex');
    expect(await axe(container, { iframes: false })).toHaveNoViolations();
  });
});
