// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { everyBlockDocument } from '../view-static/test-support/every-block-document';
import { exportDocument } from './test-support/word-document';

const line = (markdown: string, data: Record<string, unknown> = {}): QuoinBlock => ({
  id: 'line',
  type: 'MARKDOWN',
  data: { markdown, ...data },
});

describe('the runs of a Word document', () => {
  it('give each mark its run property', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.run('bold').props).toEqual({ b: '' });
    expect(doc.run('italic').props).toEqual({ i: '' });
    expect(doc.run('under').props).toEqual({ u: 'single' });
    expect(doc.run('strike').props).toEqual({ strike: '' });
    expect(doc.run('code').props).toEqual({ rStyle: 'QuoinCodeChar' });
    expect(doc.run('sub').props).toEqual({ vertAlign: 'subscript' });
    expect(doc.run('sup').props).toEqual({ vertAlign: 'superscript' });
    expect(doc.run('marked').props).toEqual({ shd: 'FDF4D2' });
    expect(doc.run('plain').props).toEqual({ shd: 'FDF4D2' });
    expect(doc.run('red').props).toEqual({ color: 'C9302D' });
    expect(doc.run('blue').props).toEqual({ shd: 'E1F3FF' });
  });

  it('write comments and custom marks as plain text', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.run('commented').props).toEqual({});
    expect(doc.run('custom').props).toEqual({});
  });

  it('write nested marks in the order Word reads them', async () => {
    const doc = await exportDocument([line('<span data-color="red">***<u>~~all~~</u>***</span> <sup>`x`</sup>')]);
    expect(Object.keys(doc.run('all').props)).toEqual(['b', 'i', 'strike', 'color', 'u']);
    expect(Object.keys(doc.run('x').props)).toEqual(['rStyle', 'vertAlign']);
  });

  it('turn safe links into hyperlinks with an external relationship', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const link = doc.run('link');
    expect(link).toMatchObject({ link: 'https://quoin.dev', props: { rStyle: 'Hyperlink' } });
    const rel = doc.relationships.find((relationship) => relationship.getAttribute('Target') === 'https://quoin.dev');
    expect(rel?.getAttribute('TargetMode')).toBe('External');
    expect(rel?.getAttribute('Type')).toMatch(/\/hyperlink$/);
  });

  it('write an unsafe link as plain text, with no relationship', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const marks = doc.paragraphs.find(({ text }) => text.includes('unsafe'))!;
    expect(marks.runs.filter((run) => run.link !== undefined).map(({ text }) => text)).toEqual(['link']);
    expect(doc.relationships.map((rel) => rel.getAttribute('Target')).filter((target) => /javascript/i.test(target ?? ''))).toEqual([]);
    const sneaky = await exportDocument([line('[a](  JaVaScRiPt:alert(1)) [b](data:text/html,x)')]);
    expect(sneaky.paragraphs[0].runs.filter((run) => run.link !== undefined)).toEqual([]);
  });

  it('link only absolute web, mail and phone addresses, writing any other target as its text and marks', async () => {
    const targets = ['\\\\\\\\host\\\\share', '//host.test/x', 'notes/a.pdf', '/files/a.pdf', '#top', 'mention:user:1'];
    const markdown = targets.map((target, at) => `[**t${at}**](<${target}>)`).join(' ');
    const doc = await exportDocument([line(markdown), line('[w](https://a.test) [m](mailto:a@b.test) [p](tel:+1555) [h](HTTP://A.test)')]);
    const [others, kept] = doc.paragraphs;
    expect(others.runs.filter(({ text }) => /^t\d$/.test(text)).map(({ link, props }) => [link, props])).toEqual(
      targets.map(() => [undefined, { b: '' }]),
    );
    expect(kept.runs.filter(({ link }) => link !== undefined).map(({ text }) => text)).toEqual(['w', 'm', 'p', 'h']);
    const external = doc.relationships.filter((rel) => rel.getAttribute('TargetMode') === 'External');
    expect(external.map((rel) => rel.getAttribute('Target'))).toEqual(['https://a.test', 'mailto:a@b.test', 'tel:+1555', 'HTTP://A.test']);
  });

  it('share one relationship between links to the same address, and keep the runs of a link together', async () => {
    const doc = await exportDocument([line('[one **two**](https://a.test) and [three](https://a.test)')]);
    const runs = doc.paragraphs[0].runs;
    expect(runs.map(({ text, link }) => [text, link])).toEqual([
      ['one ', 'https://a.test'],
      ['two', 'https://a.test'],
      [' and ', undefined],
      ['three', 'https://a.test'],
    ]);
    expect(doc.xml.match(/<w:hyperlink /g)).toHaveLength(2);
    expect(doc.relationships.filter((rel) => rel.getAttribute('Target') === 'https://a.test')).toHaveLength(1);
  });

  it('escape every character XML reads as markup, and drop those it cannot hold', async () => {
    const doc = await exportDocument([line('a < b & "c" \'d\' \u0001\u000Bend'), line('[x](https://a.test/?q="1"&r=<2>)')]);
    expect(doc.paragraphs[0].text).toBe('a < b & "c" \'d\' end');
    expect(doc.xml).toContain('a &lt; b &amp; &quot;c&quot; &apos;d&apos; end');
    expect(doc.relationships.map((rel) => rel.getAttribute('Target'))).toContain('https://a.test/?q="1"&r=<2>');
  });

  it('write line breaks, mentions and inline math', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.paragraph('one\ntwo').runs.map(({ text }) => text)).toEqual(['one\ntwo']);
    expect(doc.run('@Ada Lovelace').props).toEqual({});
    expect(doc.run('x^2').props).toEqual({ rStyle: 'QuoinCodeChar' });
  });

  it('write the plain text of atoms the schema defines, and nothing for others', async () => {
    const doc = await exportDocument([line('a <span data-atom="emoji" data-attr-name="tada"></span>b')]);
    expect(doc.paragraphs[0].text).toBe('a b');
  });

  it('keep spaces at the edges of a run', async () => {
    const doc = await exportDocument([line('two **spaces** here')]);
    expect(doc.run(' here').text).toBe(' here');
    expect(doc.xml.match(/<w:t[ >]/g)?.length).toBe(doc.xml.match(/<w:t xml:space="preserve">/g)?.length);
  });
});
