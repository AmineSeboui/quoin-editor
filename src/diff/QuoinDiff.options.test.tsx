// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { QuoinDiff } from './QuoinDiff';

const video: QuoinBlock = { id: 'v', type: 'EMBED', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' } };
const task: QuoinBlock = { id: 't', type: 'MARKDOWN', data: { markdown: '- [ ] ' } };
const TACHE = 'T\u00e2che';

describe('QuoinDiff takes the drawing options of QuoinView', () => {
  it('draws an embed as a titled frame when asked, and as a link by default', () => {
    const frameTitle = (provider: string) => `Video on ${provider}`;
    const framed = renderToStaticMarkup(<QuoinDiff before={[]} after={[video]} embeds="iframe" frameTitle={frameTitle} />);
    expect(framed).toMatch(/<iframe [^>]*title="Video on youtube"/);
    expect(renderToStaticMarkup(<QuoinDiff before={[]} after={[video]} />)).not.toContain('<iframe');
  });

  it('takes a provider of the host', () => {
    const own: QuoinBlock = { id: 'o', type: 'EMBED', data: { url: 'https://media.example/clip/7', provider: '' } };
    const match = (url: { hostname: string; pathname: string }) =>
      url.hostname === 'media.example' ? `https://media.example/embed${url.pathname}` : null;
    const html = renderToStaticMarkup(
      <QuoinDiff before={[]} after={[own]} embeds="iframe" embedProviders={[{ name: 'Media', match }]} />,
    );
    expect(html).toContain('src="https://media.example/embed/clip/7"');
  });

  it('names an empty task as told', () => {
    const html = renderToStaticMarkup(<QuoinDiff before={[task]} after={[task]} taskLabel={TACHE} />);
    expect(html).toContain(`aria-label="${TACHE}"`);
  });

  it('names an empty task with its own label when told an empty name', () => {
    const html = renderToStaticMarkup(<QuoinDiff before={[task]} after={[task]} taskLabel="" />);
    expect(html).toContain('aria-label="Task"');
    const blank = renderToStaticMarkup(<QuoinDiff before={[task]} after={[task]} labels={{ emptyTask: '' }} />);
    expect(blank).toContain('aria-label="Task"');
  });

  it('names an empty task with its own label when told a name of only white space', () => {
    expect(renderToStaticMarkup(<QuoinDiff before={[task]} after={[task]} taskLabel="  " />)).toContain('aria-label="Task"');
    const blank = renderToStaticMarkup(<QuoinDiff before={[task]} after={[task]} labels={{ emptyTask: ' ' }} />);
    expect(blank).toContain('aria-label="Task"');
  });

  it('titles a frame with its provider name when told a title that is empty or only white space', () => {
    for (const title of ['', '  ']) {
      const html = renderToStaticMarkup(<QuoinDiff before={[]} after={[video]} embeds="iframe" frameTitle={() => title} />);
      expect(html).toMatch(/<iframe [^>]*title="youtube"/);
    }
  });
});
