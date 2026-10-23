// @vitest-environment node
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { toHTML } from '../engine/render/to-html';
import { QuoinDiff } from './QuoinDiff';
import { diffAfter, diffBefore } from './test-support/diff-fixture';
import { del, ins, label } from './test-support/diff-markup';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

const diff = (before: QuoinBlock[], after: QuoinBlock[]) =>
  renderToStaticMarkup(<QuoinDiff before={before} after={after} />);

describe('QuoinDiff', () => {
  it('renders where no document or window exists, unchanged blocks as toHTML writes them', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const blocks = [md('a', '# Title'), md('b', 'Text')];
    expect(renderToString(<QuoinDiff before={blocks} after={blocks} className="doc" />)).toBe(
      `<div class="quoin-diff doc">${toHTML(blocks)}</div>`,
    );
  });

  it('marks an inserted block as added', () => {
    expect(diff([md('a', 'One')], [md('a', 'One'), md('b', 'Two')])).toBe(
      `<div class="quoin-diff"><p>One</p><div data-diff="added">${label('Added')}<p>Two</p></div></div>`,
    );
  });

  it('marks a deleted block as removed', () => {
    expect(diff([md('a', 'One'), md('b', 'Two')], [md('a', 'One')])).toBe(
      `<div class="quoin-diff"><p>One</p><div data-diff="removed">${label('Removed')}<p>Two</p></div></div>`,
    );
  });

  it('marks the words inserted and deleted in a changed block, keeping their marks', () => {
    expect(diff([md('a', 'The **quick** fox')], [md('a', 'The **slow** fox runs')])).toBe(
      `<div class="quoin-diff"><div data-diff="changed">${label('Changed')}<p>The ` +
        `${del('<strong>quick</strong>')}${ins('<strong>slow</strong>')} fox${ins(' runs')}</p></div></div>`,
    );
  });

  it('marks a moved block where it went and where it was, with ids that stay unique', () => {
    const before = [md('a', '# Top'), md('b', 'B'), md('c', 'C')];
    const after = [md('b', 'B'), md('c', 'C'), md('a', '# Top')];
    const html = diff(before, after);
    expect(html).toBe(
      `<div class="quoin-diff"><div data-diff="moved-away">${label('Moved away')}<h1 id="h-a-1">Top</h1></div>` +
        `<p>B</p><p>C</p><div data-diff="moved">${label('Moved')}<h1 id="h-a">Top</h1></div></div>`,
    );
  });

  it('shows the word changes of a block that moved and was edited', () => {
    const before = [md('a', 'Moves and stays'), md('b', 'B'), md('c', 'C')];
    const after = [md('b', 'B'), md('c', 'C'), md('a', 'Moves and changes')];
    expect(diff(before, after)).toContain(
      `<div data-diff="moved">${label('Moved')}${label('Changed')}<p>Moves and ${del('stays')}${ins('changes')}</p></div>`,
    );
  });

  it('keeps inserted, deleted and changed items inside their one list, each item marked', () => {
    const before = [md('a', '- one'), md('b', '- two'), md('c', '- three')];
    const after = [md('a', '- one'), md('b', '- two more'), md('d', '- brand new entry')];
    expect(diff(before, after)).toBe(
      '<div class="quoin-diff"><ul><li>one</li>' +
        `<li data-diff="changed">${label('Changed')} two${ins(' more')}</li>` +
        `<li data-diff="removed">${label('Removed')} three</li>` +
        `<li data-diff="added">${label('Added')} brand new entry</li></ul></div>`,
    );
  });

  it('keeps a changed line inside its quote', () => {
    const before = [md('a', '> one'), md('b', '> two')];
    const after = [md('a', '> one'), md('b', '> two too')];
    expect(diff(before, after)).toBe(
      `<div class="quoin-diff"><blockquote><p>one</p><div data-diff="changed">${label('Changed')}` +
        `<p>two${ins(' too')}</p></div></blockquote></div>`,
    );
  });

  it('names the attribute that changed when the text did not', () => {
    expect(diff([md('a', '## Section')], [md('a', '### Section')])).toBe(
      `<div class="quoin-diff"><div data-diff="changed">${label('Changed heading level')}<h3 id="h-a">Section</h3></div></div>`,
    );
    expect(diff([md('t', '- [ ] Ship')], [md('t', '- [x] Ship')])).toContain(
      `<li data-checked="true" data-diff="changed">${label('Changed checkbox')} <input type="checkbox" disabled="" aria-label="Ship" checked=""/> Ship</li>`,
    );
    const image = (alt: string): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { url: '/c.png', alt } });
    expect(diff([image('A cat')], [image('A sleeping cat')])).toContain(label('Changed alt text'));
    const chart = (points: number): QuoinBlock => ({ id: 'c', type: 'CHART', data: { points } });
    expect(diff([chart(1)], [chart(2)])).toContain(`<div data-diff="changed">${label('Changed')}<div data-type="CHART">`);
  });

  it('marks the words of every region: a callout body, a toggle summary, a table cell and a caption', () => {
    const before: QuoinBlock[] = [
      { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'Read this' } },
      { id: 't', type: 'TOGGLE', data: { markdown: 'More', open: true } },
      { id: 'g', type: 'TABLE', data: { rows: [['a', 'b'], ['one', 'two']] } },
      { id: 'i', type: 'IMAGE', data: { url: '/c.png', alt: 'Cat', caption: 'A cat' } },
    ];
    const after: QuoinBlock[] = [
      { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'Read this now' } },
      { id: 't', type: 'TOGGLE', data: { markdown: 'More here', open: true } },
      { id: 'g', type: 'TABLE', data: { rows: [['a', 'b'], ['one', 'three']] } },
      { id: 'i', type: 'IMAGE', data: { url: '/c.png', alt: 'Cat', caption: 'A black cat' } },
    ];
    const html = diff(before, after);
    expect(html).toContain(`<p>Read this${ins(' now')}</p></aside>`);
    expect(html).toContain(`<summary>More${ins(' here')}</summary>`);
    expect(html).toContain(`<td>${del('two')}${ins('three')}</td>`);
    expect(html).toContain(`<figcaption>A ${ins('black ')}cat</figcaption>`);
  });

  it('names a changed task by its new text, and by the task label when it has none', () => {
    expect(diff([md('t', '- [ ] Old')], [md('t', '- [ ] New')])).toContain('aria-label="New"');
    expect(diff([md('t', '- [ ] Old')], [md('t', '- [ ] ')])).toContain('aria-label="Task"');
  });

  it('marks a run of CJK text without spaces as one word, deleted and inserted whole', () => {
    const before = [md('a', '\u4eca\u5929\u5929\u6c14\u5f88\u597d')];
    const after = [md('a', '\u4eca\u5929\u5929\u6c14\u4e0d\u597d')];
    expect(diff(before, after)).toContain(
      `<p>${del('\u4eca\u5929\u5929\u6c14\u5f88\u597d')}${ins('\u4eca\u5929\u5929\u6c14\u4e0d\u597d')}</p>`,
    );
  });

  it('marks every change of a whole document, with each heading id once', () => {
    const html = diff(diffBefore, diffAfter);
    expect(html.match(/data-diff="(\w|-)+"/g)?.map((attr) => attr.slice(11, -1))).toEqual([
      'moved',
      'changed',
      'removed',
      'added',
      'changed',
      'removed',
      'added',
      'changed',
      'changed',
      'changed',
      'changed',
      'changed',
      'moved-away',
      'moved-away',
      'moved',
      'changed',
    ]);
    expect(html.match(/<ul>/g)).toHaveLength(1);
    expect(html.match(/<blockquote>/g)).toHaveLength(1);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws custom previews and highlighted code as QuoinView does', () => {
    const blockTypes = [{ type: 'CHART', label: 'Chart', icon: () => null, preview: () => <output>chart</output> }];
    const chart: QuoinBlock = { id: 'c', type: 'CHART', data: {} };
    expect(renderToStaticMarkup(<QuoinDiff before={[]} after={[chart]} blockTypes={blockTypes} />)).toBe(
      `<div class="quoin-diff"><div data-diff="added">${label('Added')}<div data-type="CHART"><output>chart</output></div></div></div>`,
    );
    const code: QuoinBlock = { id: 'k', type: 'CODE', data: { language: '', code: 'ab' } };
    const highlight = (text: string) => [[{ text, className: 'k' }]];
    expect(renderToStaticMarkup(<QuoinDiff before={[code]} after={[code]} highlight={highlight} />)).toBe(
      '<div class="quoin-diff"><pre><code><span class="k">ab</span></code></pre></div>',
    );
  });

  it('speaks and shows the labels it is given', () => {
    const labels = { added: 'Ajout\u00e9', inserted: 'ins\u00e9r\u00e9', changed: () => 'Modifi\u00e9' };
    const html = renderToStaticMarkup(<QuoinDiff before={[md('a', 'x')]} after={[md('a', 'x y'), md('b', 'z')]} labels={labels} />);
    expect(html).toContain(label('Ajout\u00e9'));
    expect(html).toContain(label('Modifi\u00e9'));
    expect(html).toContain('>ins\u00e9r\u00e9 </span>');
    expect(html).toContain('> end inserted </span>');
  });

  it('calls no hook, so it renders as a server component outside any React renderer', () => {
    expect(() => QuoinDiff({ before: diffBefore, after: diffAfter })).not.toThrow();
  });
});

describe('the diff entry', () => {
  it('exports QuoinDiff, the English labels and defineBlock at runtime', async () => {
    expect(Object.keys(await import('./index')).sort()).toEqual(['QuoinDiff', 'defineBlock', 'englishDiffLabels']);
  });
});
