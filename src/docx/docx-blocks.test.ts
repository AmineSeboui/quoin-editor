// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { everyBlockDocument } from '../view-static/test-support/every-block-document';
import { textOf } from './test-support/unzip';
import { exportDocument, type WordDocument } from './test-support/word-document';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown }, indent });

const numbering = (doc: WordDocument) => textOf(doc.entries, 'word/numbering.xml');

describe('the blocks of a Word document', () => {
  it('give headings their style, alignment, colours and a bookmark the contents link to', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const heading = (text: string) => doc.paragraphs.find((paragraph) => paragraph.text === text && paragraph.style !== undefined)!;
    const title = heading('Every block');
    expect(title).toMatchObject({ style: 'Heading1', align: 'center', shade: 'E1F3FF' });
    expect(title.runs[0].props).toEqual({ color: 'C9302D' });
    expect(heading('Lists').style).toBe('Heading2');
    expect(heading('Blocks').style).toBe('Heading3');
    const contents = doc.paragraphs.filter(({ runs }) => runs[0]?.link?.startsWith('#'));
    expect(contents.map(({ text, runs }) => [text, runs[0].link])).toEqual([
      ['Every block', `#${title.bookmark}`],
      ['Lists', `#${heading('Lists').bookmark}`],
      ['Blocks', `#${heading('Blocks').bookmark}`],
    ]);
    expect(contents.map(({ indent }) => indent)).toEqual([undefined, '360', '720']);
  });

  it('give every heading level from 1 to 6 its style', async () => {
    const doc = await exportDocument([1, 2, 3, 4, 5, 6].map((level) => md(`h${level}`, `${'#'.repeat(level)} Level ${level}`)));
    expect(doc.paragraphs.map(({ style }) => style)).toEqual(['Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6']);
  });

  it('number bullet and ordered lists with their level from the indent, restarting each ordered list at its start', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const bullet = doc.paragraph('bullet');
    const third = doc.paragraph('third');
    expect(bullet).toMatchObject({ level: '0' });
    expect(third).toMatchObject({ level: '1' });
    expect(doc.paragraph('fourth')).toMatchObject({ level: '1', numId: third.numId });
    expect(third.numId).not.toBe(bullet.numId);
    expect(numbering(doc)).toContain(
      `<w:num w:numId="${third.numId}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="1"><w:startOverride w:val="3"/></w:lvlOverride></w:num>`,
    );
    expect(doc.paragraph('deep')).toMatchObject({ numId: undefined, indent: '2160' });
  });

  it('restart numbering for each ordered list and cap the level at the nine Word has', async () => {
    const doc = await exportDocument([md('a', '1. one'), md('p', 'between'), md('b', '1. again'), md('c', '- far', 12)]);
    expect(doc.paragraph('one').numId).not.toBe(doc.paragraph('again').numId);
    expect(doc.paragraph('far').level).toBe('8');
    expect(numbering(doc).match(/<w:lvl w:ilvl=/g)).toHaveLength(18);
  });

  it('write tasks as a checkbox character and their text', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.paragraph('\u2611 done').numId).toBeUndefined();
    expect(doc.paragraph('\u2610 open').indent).toBe('360');
    expect(doc.paragraph('\u2610 ')).toBeDefined();
  });

  it('write quotes in the quote style, indented by their indent', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.paragraph('quoted')).toMatchObject({ style: 'Quote', indent: undefined });
    expect(doc.paragraph('again')).toMatchObject({ style: 'Quote' });
    expect(doc.paragraph('indented')).toMatchObject({ style: 'Quote', indent: '720' });
  });

  it('write a divider as a paragraph with a bottom border', async () => {
    const doc = await exportDocument([{ id: 'd', type: 'DIVIDER', data: {} }]);
    expect(doc.paragraphs).toHaveLength(1);
    expect(doc.paragraphs[0]).toMatchObject({ text: '', border: true });
    expect(doc.xml).toContain('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr>');
  });

  it('write a callout as a shaded table of one cell, with its icon and body', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const callout = doc.paragraph('! Mind the gap');
    expect(callout.inTable).toBe(true);
    expect(callout.runs.find(({ text }) => text === 'the')?.props).toEqual({ b: '' });
    const cell = callout.element.parentElement!;
    expect(cell.getElementsByTagName('w:shd')[0].getAttribute('w:fill')).toBe('FDF4D2');
    expect(doc.paragraph('No icon').inTable).toBe(true);
  });

  it('write code in the code style, a line break between its lines', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.paragraph('const a = 1 < 2;\nconst b = "x";').style).toBe('QuoinCode');
    expect(doc.paragraph('plain').style).toBe('QuoinCode');
  });

  it('write a toggle as its summary followed by its children, open or closed', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const texts = doc.paragraphs.map(({ text }) => text);
    expect(texts.indexOf('inside')).toBe(texts.indexOf('Open toggle') + 1);
    expect(doc.paragraph('inside').indent).toBe('720');
    expect(doc.paragraph('Closed toggle')).toBeDefined();
  });

  it('write a table with its header row, cells, marks and column alignment', async () => {
    const doc = await exportDocument(everyBlockDocument);
    const tables = [...doc.body.getElementsByTagName('w:tbl')].filter((table) => table.getElementsByTagName('w:tr').length > 1);
    const [table] = tables;
    expect(table.getElementsByTagName('w:tblHeader')).toHaveLength(1);
    expect(table.getElementsByTagName('w:gridCol')).toHaveLength(2);
    expect(doc.run('Ada').props).toEqual({ b: '' });
    expect(doc.paragraph('Role')).toMatchObject({ inTable: true, align: 'right' });
    expect(doc.paragraph('Author').align).toBe('right');
    let headless = doc.paragraph('a').element;
    while (headless.tagName !== 'w:tbl') headless = headless.parentElement!;
    expect(headless.getElementsByTagName('w:tblHeader')).toHaveLength(0);
  });

  it('keep two tables apart with an empty paragraph, as Word would join them', async () => {
    const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['a']], header: false } };
    const doc = await exportDocument([table, { ...table, id: 'u' }]);
    expect([...doc.body.children].map(({ tagName }) => tagName)).toEqual(['w:tbl', 'w:p', 'w:tbl', 'w:p', 'w:sectPr']);
  });

  it('write files, embeds and bookmarks as links', async () => {
    const doc = await exportDocument(everyBlockDocument, { resolveAssetUrl: (key) => `https://assets.test/${key}` });
    expect(doc.run('notes <1>.pdf').link).toBe('https://assets.test/notes.pdf');
    expect(doc.run('https://www.youtube.com/watch?v=dQw4w9WgXcQ').link).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(doc.run('Quoin & docs').link).toBe('https://quoin.dev/docs');
  });

  it('write a file whose address is unsafe as its name, unlinked', async () => {
    const doc = await exportDocument([{ id: 'f', type: 'FILE', data: { storageKey: 'k', filename: 'f.pdf' } }], {
      resolveAssetUrl: () => 'javascript:alert(1)',
    });
    expect(doc.run('f.pdf').link).toBeUndefined();
  });

  it('write math as its source in a code run', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.run('e^{i\\pi} + 1 = 0').props).toEqual({ rStyle: 'QuoinCodeChar' });
  });

  it('write a block type it does not know as its type and plain text, indented', async () => {
    const doc = await exportDocument(everyBlockDocument);
    expect(doc.paragraph('[CHART]')).toMatchObject({ indent: '720' });
  });

  it('write the plain text of a custom block whose spec gives one', async () => {
    const { createSchema } = await import('../engine/schema/create-schema');
    const schema = createSchema({
      blocks: [
        {
          type: 'NOTE',
          flow: 'void',
          fromData: (data) => ({ attrs: { note: data.note }, regions: {} }),
          toData: (block) => ({ note: block.attrs.note }),
          initial: () => ({ attrs: {}, regions: {} }),
          toPlainText: (block) => String(block.attrs.note),
        },
      ],
    });
    const doc = await exportDocument([{ id: 'n', type: 'NOTE', data: { note: 'remember' } }], { schema });
    expect(doc.paragraph('[NOTE] remember')).toBeDefined();
  });
});
