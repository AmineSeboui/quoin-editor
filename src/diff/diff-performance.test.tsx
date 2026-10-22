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
  expect(diff).toBeLessThan(1_000);
  expect(diff / view).toBeLessThan(6);
});
