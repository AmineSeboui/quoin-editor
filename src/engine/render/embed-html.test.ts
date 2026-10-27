import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { toHTML, type HTMLOptions } from './to-html';

const SANDBOX = 'sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"';
const FRAME_ATTRS = `${SANDBOX} loading="lazy" referrerpolicy="strict-origin-when-cross-origin"`;
const embed = (url: string, provider = ''): QuoinBlock => ({ id: 'e', type: 'EMBED', data: { url, provider } });
const framed = (url: string, options: HTMLOptions = {}) => toHTML([embed(url)], { embeds: 'iframe', ...options });
const frame = (src: string, title: string) => `<iframe src="${src}" title="${title}" ${FRAME_ATTRS}></iframe>`;
const PROVIDERS = ['youtube', 'vimeo', 'loom', 'codepen', 'spotify', 'soundcloud', 'figma'];
const providerOf = (src: string) => PROVIDERS.find((name) => src.includes(name)) ?? '';
const link = (href: string) => `<p><a href="${href}" rel="noopener noreferrer">${href}</a></p>`;

describe('embed providers', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'],
    ['https://player.vimeo.com/video/76979871', 'https://player.vimeo.com/video/76979871'],
    ['https://www.loom.com/share/0123456789abcdef', 'https://www.loom.com/embed/0123456789abcdef'],
    ['https://codepen.io/team/pen/AbCdEf', 'https://codepen.io/team/embed/AbCdEf'],
    ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'],
    ['https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3', 'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3'],
    ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M'],
    ['https://open.spotify.com/episode/512ojhOuo1ktJprKbVcKyQ', 'https://open.spotify.com/embed/episode/512ojhOuo1ktJprKbVcKyQ'],
    ['https://open.spotify.com/show/2MAi0BvDc6GTFvKFPXnkCL', 'https://open.spotify.com/embed/show/2MAi0BvDc6GTFvKFPXnkCL'],
    [
      'https://soundcloud.com/forss/flickermood',
      `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com/forss/flickermood')}`,
    ],
  ])('frames %s as %s', (url, src) => {
    expect(framed(url)).toBe(frame(src, providerOf(src)));
  });

  it.each(['file', 'design', 'proto', 'board'])('frames a Figma %s link through the Figma embed page', (kind) => {
    const url = `https://www.figma.com/${kind}/AbC123/Name?node-id=1-2`;
    expect(framed(url)).toBe(frame(`https://www.figma.com/embed?embed_host=quoin&amp;url=${encodeURIComponent(url)}`, 'figma'));
  });

  it('renders a link for an address no provider recognises, whatever the provider field says', () => {
    expect(framed('https://evil.example/phish')).toBe(link('https://evil.example/phish'));
    expect(toHTML([embed('https://evil.example/phish', 'youtube')], { embeds: 'iframe' })).toBe(
      link('https://evil.example/phish'),
    );
  });

  it('renders the same link as the link mode for an unrecognised address', () => {
    const url = 'https://example.com/page';
    expect(framed(url)).toBe(toHTML([embed(url)], { embeds: 'link' }));
  });

  it('renders a link for a recognised host with a path no provider reads', () => {
    for (const url of [
      'https://www.youtube.com/',
      'https://www.youtube.com/watch',
      'https://www.youtube.com/@channel',
      'https://vimeo.com/channels/staffpicks',
      'https://www.loom.com/',
      'https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF',
      'https://soundcloud.com/forss',
      'https://www.figma.com/community/file/1',
    ]) {
      expect(framed(url)).toBe(link(url));
    }
  });

  it('never frames a link in link mode', () => {
    expect(toHTML([embed('https://youtu.be/dQw4w9WgXcQ')], { embeds: 'link' })).toBe(link('https://youtu.be/dQw4w9WgXcQ'));
    expect(toHTML([embed('https://youtu.be/dQw4w9WgXcQ')])).toBe(link('https://youtu.be/dQw4w9WgXcQ'));
  });

  it('never frames a hostile address', () => {
    for (const url of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'mailto:a@b.c',
      'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
      'https://user:secret@www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
      'https://evil.example/https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be.evil.example/dQw4w9WgXcQ',
      'https://vimeo.com.evil.example/76979871',
      'https://youtube.com:8443/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=x%22%20onload%3Dalert(1)',
      'https://www.youtube.com/watch?v=a/../../b',
      '//www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/relative/path',
      '',
    ]) {
      expect(framed(url)).not.toContain('<iframe');
    }
  });

  it('writes the sandbox and the referrer policy only on a framed provider', () => {
    expect(framed('https://youtu.be/dQw4w9WgXcQ')).toContain(FRAME_ATTRS);
    expect(framed('https://evil.example/x')).not.toContain('sandbox');
    expect(framed('https://evil.example/x')).not.toContain('referrerpolicy');
  });

  it('indents a framed embed', () => {
    const block: QuoinBlock = { ...embed('https://youtu.be/dQw4w9WgXcQ'), indent: 2 };
    expect(toHTML([block], { embeds: 'iframe' })).toBe(
      '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="youtube" ' +
        `${FRAME_ATTRS} data-indent="2"></iframe>`,
    );
  });
});

describe('host embed providers', () => {
  const acme = { name: 'acme', match: (url: URL) => (url.hostname === 'video.acme.test' ? `https://embed.acme.test${url.pathname}` : null) };

  it('frames an address a host provider recognises', () => {
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [acme] })).toBe(frame('https://embed.acme.test/clip-1', 'acme'));
  });

  it('keeps the built in providers beside the host ones', () => {
    expect(framed('https://youtu.be/dQw4w9WgXcQ', { embedProviders: [acme] })).toContain('youtube-nocookie.com');
  });

  it('lets a host provider take an address before the built in ones', () => {
    const proxy = { name: 'proxy', match: () => 'https://proxy.example/frame' };
    expect(framed('https://youtu.be/dQw4w9WgXcQ', { embedProviders: [proxy] })).toBe(frame('https://proxy.example/frame', 'proxy'));
  });

  it('still renders a link when no host provider recognises the address', () => {
    expect(framed('https://other.test/clip', { embedProviders: [acme] })).toBe(link('https://other.test/clip'));
  });

  it('refuses an embed address that is not https', () => {
    for (const result of [
      'http://embed.acme.test/clip',
      'javascript:alert(1)',
      'data:text/html,x',
      '//embed.acme.test/clip',
      '/clip',
      'https://user:pw@embed.acme.test/clip',
      'not a url',
      '',
    ]) {
      const bad = { name: 'bad', match: () => result };
      expect(framed('https://video.acme.test/clip-1', { embedProviders: [bad] })).toBe(link('https://video.acme.test/clip-1'));
    }
  });

  it('falls through to the next provider when one returns an unusable address', () => {
    const bad = { name: 'bad', match: () => 'javascript:alert(1)' };
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [bad, acme] })).toBe(
      frame('https://embed.acme.test/clip-1', 'acme'),
    );
  });

  it('titles a frame with its provider name when the host makes nothing of it, and with its page when it has no name', () => {
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [acme], frameTitle: () => '' })).toBe(
      frame('https://embed.acme.test/clip-1', 'acme'),
    );
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [{ ...acme, name: '' }] })).toBe(
      frame('https://embed.acme.test/clip-1', 'https://video.acme.test/clip-1'),
    );
  });

  it('takes a title or a provider name of only white space for none', () => {
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [acme], frameTitle: () => '  ' })).toBe(
      frame('https://embed.acme.test/clip-1', 'acme'),
    );
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [{ ...acme, name: ' ' }], frameTitle: () => ' ' })).toBe(
      frame('https://embed.acme.test/clip-1', 'https://video.acme.test/clip-1'),
    );
  });

  it('titles a frame with what the host makes of its provider name', () => {
    expect(framed('https://video.acme.test/clip-1', { embedProviders: [acme], frameTitle: (name) => `${name} player` })).toBe(
      frame('https://embed.acme.test/clip-1', 'acme player'),
    );
  });

  it('frames nothing in link mode, host providers included', () => {
    expect(toHTML([embed('https://video.acme.test/clip-1')], { embedProviders: [acme] })).toBe(
      link('https://video.acme.test/clip-1'),
    );
  });
});
