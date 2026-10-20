import type { EmbedProvider } from '../../engine';
import { matchEmbed } from './providers';

const YOUTUBE_FRAME = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('the providers an embed is framed by', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', YOUTUBE_FRAME],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube', YOUTUBE_FRAME],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', YOUTUBE_FRAME],
    ['https://vimeo.com/76979871', 'vimeo', 'https://player.vimeo.com/video/76979871'],
    ['https://www.loom.com/share/0123456789abcdef', 'loom', 'https://www.loom.com/embed/0123456789abcdef'],
    [
      'https://www.figma.com/file/AbC123/Name',
      'figma',
      `https://www.figma.com/embed?embed_host=quoin&url=${encodeURIComponent('https://www.figma.com/file/AbC123/Name')}`,
    ],
    ['https://codepen.io/team/pen/AbCdEf', 'codepen', 'https://codepen.io/team/embed/AbCdEf'],
    [
      'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
      'spotify',
      'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3',
    ],
    [
      'https://soundcloud.com/forss/flickermood',
      'soundcloud',
      `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com/forss/flickermood')}`,
    ],
  ])('frame %s through %s', (url, provider, src) => {
    expect(matchEmbed(url)).toEqual({ provider, src });
  });

  it.each([
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'ftp://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://evilyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/@channel',
    'not a link',
  ])('frame nothing for %s', (url) => {
    expect(matchEmbed(url)).toBeNull();
  });

  it('take a host provider before the built-in ones', () => {
    const proxy: EmbedProvider = { name: 'proxy', match: () => 'https://proxy.test/frame' };
    expect(matchEmbed('https://youtu.be/dQw4w9WgXcQ', [proxy])).toEqual({ provider: 'proxy', src: 'https://proxy.test/frame' });
    expect(matchEmbed('https://youtu.be/dQw4w9WgXcQ', [])).toEqual({ provider: 'youtube', src: YOUTUBE_FRAME });
  });

  it('pass over a host provider whose frame is not https, or that throws', () => {
    const plain: EmbedProvider = { name: 'plain', match: () => 'http://frames.test/clip' };
    const broken: EmbedProvider = {
      name: 'broken',
      match: () => {
        throw new Error('broken provider');
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(matchEmbed('https://youtu.be/dQw4w9WgXcQ', [plain, broken])).toEqual({ provider: 'youtube', src: YOUTUBE_FRAME });
    expect(matchEmbed('https://clips.test/1', [plain])).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"broken"'));
    warn.mockRestore();
  });
});
