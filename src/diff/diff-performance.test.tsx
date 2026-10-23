// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { QuoinView } from '../view-static/QuoinView';
import { QuoinDiff } from './QuoinDiff';

const KINDS = ['## Heading', '- item', '- [ ] task', '> quote', 'A paragraph with **bold** and a [link](https://quoin.dev).'];

const document = (size: number): QuoinBlock[] =>
  Array.from({ length: size }, (_, at) => ({ id: `b${at}`, type: 'MARKDOWN', data: { markdown: `${KINDS[at % 5]} ${at}` } }));

function edited(blocks: QuoinBlock[]): QuoinBlock[] {
  const after = blocks.map((block, at) => (at % 200 === 7 ? { ...block, data: { markdown: `${block.data.markdown} edited` } } : block));
  after.splice(500, 1);
  after.splice(300, 0, { id: 'new', type: 'MARKDOWN', data: { markdown: 'Inserted' } });
  after.push(after.splice(10, 1)[0]);
  return after;
}

const SLOW = 60_000;

const fastest = (render: () => unknown) => {
  let best = Infinity;
  for (let run = 0; run < 5; run++) {
    const start = performance.now();
    render();
    best = Math.min(best, performance.now() - start);
  }
  return best;
};

it('renders a diff of a 1,000 block document with a handful of changes in a time close to the view of it', () => {
  const before = document(1_000);
  const after = edited(before);
  const html = renderToStaticMarkup(<QuoinDiff before={before} after={after} />);
  expect(html.match(/data-diff="/g)?.length).toBeGreaterThanOrEqual(8);
  const diff = fastest(() => renderToStaticMarkup(<QuoinDiff before={before} after={after} />));
  const view = fastest(() => renderToStaticMarkup(<QuoinView blocks={after} />));
  expect(diff / view).toBeLessThan(6);
}, SLOW);

const LIMITS: Record<string, number> = {
  'every block edited': 12,
  'every id new, the text the same': 40,
  'every id and text new': 30,
  'the order reversed': 40,
  'half moved': 40,
};

const REWRITES: Record<string, (blocks: QuoinBlock[]) => QuoinBlock[]> = {
  'every block edited': (blocks) => blocks.map((block) => ({ ...block, data: { markdown: `${block.data.markdown} terms` } })),
  'every id new, the text the same': (blocks) => blocks.map((block, at) => ({ ...block, id: `n${at}` })),
  'every id and text new': (blocks) => blocks.map((_, at) => ({ id: `n${at}`, type: 'MARKDOWN', data: { markdown: `Different ${at} line` } })),
  'the order reversed': (blocks) => [...blocks].reverse(),
  'half moved': (blocks) => [...blocks.slice(500), ...blocks.slice(0, 500)],
};

// The diff of a rewrite draws both versions, so it is held against the view of both.
it.each(Object.keys(REWRITES))('renders a diff of a 1,000 block document with %s in a bounded time', (name) => {
  const before = document(1_000);
  const after = REWRITES[name](before);
  const diff = fastest(() => renderToStaticMarkup(<QuoinDiff before={before} after={after} />));
  const view = fastest(() => renderToStaticMarkup(<QuoinView blocks={[...before, ...after]} />));
  expect(diff / view).toBeLessThan(LIMITS[name]);
}, SLOW);
