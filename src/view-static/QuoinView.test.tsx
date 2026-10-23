// @vitest-environment node
import fc from 'fast-check';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { arbitraryBlocks } from '../engine/blocks/blocks-arbitrary';
import { toHTML, type HTMLOptions } from '../engine/render/to-html';
import { QuoinView } from './QuoinView';
import { canonicalHtml } from './test-support/canonical-html';
import { everyBlockDocument, everyBlockOptions } from './test-support/every-block-document';

const wrapped = (html: string, className = 'doc') => canonicalHtml(`<div class="quoin-view ${className}">${html}</div>`);

describe('QuoinView', () => {
  it('renders where no document or window exists', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    expect(renderToString(<QuoinView blocks={[]} />)).toBe('<div class="quoin-view"></div>');
  });

  it('renders the HTML toHTML writes for a document of every block, mark and atom', () => {
    const html = renderToString(<QuoinView blocks={everyBlockDocument} className="doc" {...everyBlockOptions} />);
    expect(canonicalHtml(html)).toBe(wrapped(toHTML(everyBlockDocument, everyBlockOptions)));
    expect(html).not.toContain('<!-- -->');
  });

  it('renders the same structure as toHTML for any document and options', () => {
    const options = fc.record(
      {
        embeds: fc.constantFrom<HTMLOptions['embeds']>('iframe', 'link'),
        renderMath: fc.constant<HTMLOptions['renderMath']>((latex) => `<i>${latex.replace(/[<&]/g, '')}</i>`),
        resolveAssetUrl: fc.constant<HTMLOptions['resolveAssetUrl']>((key) => `/a/${key}`),
      },
      { requiredKeys: [] },
    );
    fc.assert(
      fc.property(arbitraryBlocks({ extras: true }), options, (blocks, picked) => {
        const html = renderToStaticMarkup(<QuoinView blocks={blocks} className="doc" {...picked} />);
        expect(canonicalHtml(html)).toBe(wrapped(toHTML(blocks, picked)));
      }),
      { numRuns: 300 },
    );
  });

  it('loads its pictures lazily, so a server render hoists no preload for any of them', () => {
    const blocks = Array.from({ length: 14 }, (_, at) => ({ id: `i${at}`, type: 'IMAGE', data: { url: `/p${at}.png`, alt: '' } }));
    const html = renderToString(<QuoinView blocks={blocks} />);
    expect(html).not.toContain('<link');
    expect(html.match(/<img [^>]*loading="lazy" decoding="async"/g)).toHaveLength(14);
    expect(canonicalHtml(html)).toBe(canonicalHtml(`<div class="quoin-view">${toHTML(blocks)}</div>`));
  });

  it('calls no hook, so it renders as a server component outside any React renderer', () => {
    expect(() => QuoinView({ blocks: everyBlockDocument, ...everyBlockOptions })).not.toThrow();
  });

  it('draws the preview of a custom block type inside the element toHTML writes for it', () => {
    const blocks = [{ id: 'chart', type: 'CHART', data: { points: [1, 2] }, indent: 1 }];
    const blockTypes = [
      {
        type: 'CHART',
        label: 'Chart',
        icon: () => null,
        preview: ({ data, blockId }: { data: Record<string, unknown>; blockId?: string }) => (
          <figure data-chart={blockId}>{String(data.points)}</figure>
        ),
      },
    ];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={blockTypes} />)).toBe(
      '<div class="quoin-view"><div data-type="CHART" data-indent="1"><figure data-chart="chart">1,2</figure></div></div>',
    );
    const noPreview = [{ type: 'CHART', label: 'Chart', icon: () => null, editor: () => null }];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={noPreview} />)).toBe(
      `<div class="quoin-view">${toHTML(blocks)}</div>`,
    );
  });

  it('keeps drawing the blocks Quoin renders itself when a definition shares their type', () => {
    const blocks = [{ id: 'd', type: 'DIVIDER', data: {} }];
    const blockTypes = [{ type: 'DIVIDER', label: 'Rule', icon: () => null, preview: () => <b>rule</b> }];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={blockTypes} />)).toBe('<div class="quoin-view"><hr/></div>');
  });

  it('highlights code with the tokens of the highlighter, and draws plain code when they misspell it', () => {
    const blocks = [{ id: 'c', type: 'CODE', data: { language: 'ts', code: 'let a\n<b>' } }];
    const highlight = (code: string) =>
      code.split('\n').map((line) => [{ text: line.slice(0, 1), color: 'red' }, { text: line.slice(1), className: 'k' }]);
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} highlight={highlight} />)).toBe(
      '<div class="quoin-view"><pre><code class="language-ts"><span style="color:red">l</span><span class="k">et a</span>\n' +
        '<span style="color:red">&lt;</span><span class="k">b&gt;</span></code></pre></div>',
    );
    const misspelt = () => [[{ text: 'nope' }]];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} highlight={misspelt} />)).toBe(
      `<div class="quoin-view">${toHTML(blocks)}</div>`,
    );
  });

  it('keeps a token colour only when it is one colour value', () => {
    const blocks = [{ id: 'c', type: 'CODE', data: { language: '', code: 'abcd' } }];
    const colours = ['red;background-image:url(https://t.example/x)', '#0a0B0c', 'var(--shiki-token-keyword)', 'rgb(1 2 3 / 50%)'];
    const highlight = (code: string) => [[...code].map((text, at) => ({ text, color: colours[at] }))];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} highlight={highlight} />)).toBe(
      '<div class="quoin-view"><pre><code><span>a</span><span style="color:#0a0B0c">b</span>' +
        '<span style="color:var(--shiki-token-keyword)">c</span><span style="color:rgb(1 2 3 / 50%)">d</span></code></pre></div>',
    );
  });

  it('inserts the markup of renderMath as it is, for block and inline math', () => {
    const blocks = [
      { id: 'm', type: 'MATH', data: { latex: 'x' } },
      { id: 'p', type: 'MARKDOWN', data: { markdown: 'a $y$ b' } },
    ];
    const renderMath = (latex: string, { displayMode }: { displayMode: boolean }) => `<k data-d="${displayMode}">${latex}</k>`;
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} renderMath={renderMath} />)).toBe(
      '<div class="quoin-view"><div data-math=""><k data-d="true">x</k></div><p>a <span data-math=""><k data-d="false">y</k></span> b</p></div>',
    );
  });
});

describe('the view entry', () => {
  it('exports QuoinView and defineBlock and nothing else at runtime', async () => {
    expect(Object.keys(await import('./index')).sort()).toEqual(['QuoinView', 'defineBlock']);
  });
});
