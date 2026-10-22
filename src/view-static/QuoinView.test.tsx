// @vitest-environment node
import fc from 'fast-check';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { arbitraryBlocks } from '../engine/blocks/blocks-arbitrary';
import { toHTML, type HTMLOptions } from '../engine/render/to-html';
import { QuoinView } from './QuoinView';
import { canonicalHtml } from './test-support/canonical-html';
import { everyBlockDocument, everyBlockOptions } from './test-support/every-block-document';

const wrapped = (html: string, className = 'doc') => canonicalHtml(`<div class="${className}">${html}</div>`);

describe('QuoinView', () => {
  it('renders where no document or window exists', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    expect(renderToString(<QuoinView blocks={[]} />)).toBe('<div></div>');
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
      '<div><div data-type="CHART" data-indent="1"><figure data-chart="chart">1,2</figure></div></div>',
    );
    const noPreview = [{ type: 'CHART', label: 'Chart', icon: () => null, editor: () => null }];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={noPreview} />)).toBe(
      `<div>${toHTML(blocks)}</div>`,
    );
  });

  it('keeps drawing the blocks Quoin renders itself when a definition shares their type', () => {
    const blocks = [{ id: 'd', type: 'DIVIDER', data: {} }];
    const blockTypes = [{ type: 'DIVIDER', label: 'Rule', icon: () => null, preview: () => <b>rule</b> }];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} blockTypes={blockTypes} />)).toBe('<div><hr/></div>');
  });

  it('highlights code with the tokens of the highlighter, and draws plain code when they misspell it', () => {
    const blocks = [{ id: 'c', type: 'CODE', data: { language: 'ts', code: 'let a\n<b>' } }];
    const highlight = (code: string) =>
      code.split('\n').map((line) => [{ text: line.slice(0, 1), color: 'red' }, { text: line.slice(1), className: 'k' }]);
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} highlight={highlight} />)).toBe(
      '<div><pre><code class="language-ts"><span style="color:red">l</span><span class="k">et a</span>\n' +
        '<span style="color:red">&lt;</span><span class="k">b&gt;</span></code></pre></div>',
    );
    const misspelt = () => [[{ text: 'nope' }]];
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} highlight={misspelt} />)).toBe(
      `<div>${toHTML(blocks)}</div>`,
    );
  });

  it('inserts the markup of renderMath as it is, for block and inline math', () => {
    const blocks = [
      { id: 'm', type: 'MATH', data: { latex: 'x' } },
      { id: 'p', type: 'MARKDOWN', data: { markdown: 'a $y$ b' } },
    ];
    const renderMath = (latex: string, { displayMode }: { displayMode: boolean }) => `<k data-d="${displayMode}">${latex}</k>`;
    expect(renderToStaticMarkup(<QuoinView blocks={blocks} renderMath={renderMath} />)).toBe(
      '<div><div data-math=""><k data-d="true">x</k></div><p>a <span data-math=""><k data-d="false">y</k></span> b</p></div>',
    );
  });
});

describe('the view entry', () => {
  it('exports QuoinView and nothing else at runtime', async () => {
    expect(Object.keys(await import('./index'))).toEqual(['QuoinView']);
  });
});
