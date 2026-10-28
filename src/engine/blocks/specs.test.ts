import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const schema = createSchema();
const codec = createBlockCodec(schema, { newId: () => 'new' });
const engineBlock = (type: string, data: Record<string, unknown>) =>
  codec.toEngineBlocks({ id: 'x', type, data })[0];
// A copy of the engine block is not in the codec cache, so toQuoin serializes it again.
const roundTrip = (type: string, data: Record<string, unknown>) =>
  codec.toQuoin({ ...engineBlock(type, data) }).data;

describe('core block specs', () => {
  it.each([
    ['MARKDOWN', { markdown: 'plain **bold**' }],
    ['MARKDOWN', { markdown: '## Title', align: 'center' }],
    ['MARKDOWN', { markdown: '- [x] done', color: 'red', background: 'yellow' }],
    ['MARKDOWN', { markdown: '3. third', custom: 1 }],
    ['CALLOUT', { tone: 'warning', body: 'Mind **this**', icon: '\u26A0\uFE0F' }],
    ['CODE', { language: 'ts', code: 'let a = 1;\n' }],
    ['IMAGE', { storageKey: 'k', alt: 'A', caption: 'cap _x_', width: 10, height: 20 }],
    ['IMAGE', { storageKey: '', alt: '', url: 'https://i.png', align: 'center', widthPercent: 50 }],
    ['FILE', { storageKey: 'k', filename: 'a.pdf', size: 3 }],
    ['DIVIDER', {}],
    ['TOGGLE', { markdown: 'Summary', open: true }],
    ['TABLE', { rows: [['a', 'b'], ['c\\|d', 'e<br>f']], header: true, align: ['left', null] }],
    ['EMBED', { url: 'https://youtu.be/x', provider: 'youtube' }],
    ['BOOKMARK', { url: 'https://a.b', title: 'A' }],
    ['MATH', { latex: '\\frac{a}{b}' }],
    ['TOC', {}],
  ])('%s keeps canonical data %j', (type, data) => {
    expect(roundTrip(type, data)).toEqual(data);
  });

  it('keeps an image decorative flag as a known attribute, only when true', () => {
    const data = { storageKey: 'k', alt: '', decorative: true };
    const block = engineBlock('IMAGE', data);
    expect(block.attrs).toMatchObject({ decorative: true });
    expect(block.attrs.extra).toBeUndefined();
    expect(roundTrip('IMAGE', data)).toEqual(data);
    expect(roundTrip('IMAGE', { ...data, decorative: false })).toEqual({ storageKey: 'k', alt: '' });
    expect(roundTrip('IMAGE', { ...data, decorative: 'yes' })).toEqual({ storageKey: 'k', alt: '' });
  });

  it('parses MARKDOWN into kind attrs and a text region', () => {
    const [block] = codec.toEngineBlocks({ id: 'm', type: 'MARKDOWN', data: { markdown: '## Hi **x**' } });
    expect(block.attrs).toMatchObject({ kind: 'heading', level: 2 });
    expect(block.regions.text).toEqual([text('Hi '), text('x', [{ type: 'bold' }])]);
  });

  it('drops invalid colours and alignments', () => {
    expect(roundTrip('MARKDOWN', { markdown: 'x', color: 'hotpink', align: 'diagonal' })).toEqual({ markdown: 'x' });
  });

  it('coerces wrong field types the way 0.4 did', () => {
    expect(roundTrip('CODE', { language: 3, code: null })).toEqual({ language: '', code: '' });
  });

  it('keeps an unknown type untouched', () => {
    const data = { anything: { nested: true } };
    expect(roundTrip('PLUGIN', data)).toBe(data);
  });

  it('splits headings into paragraphs and tasks into unchecked tasks', () => {
    const md = schema.blocks.get('MARKDOWN')!;
    expect(md.splitAttrs!({ kind: 'heading', level: 2, align: 'center', color: 'red' })).toEqual({
      type: 'MARKDOWN',
      attrs: { kind: 'paragraph', align: 'center' },
    });
    expect(md.splitAttrs!({ kind: 'task', checked: true })).toEqual({ type: 'MARKDOWN', attrs: { kind: 'task', checked: false } });
    expect(md.splitAttrs!({ kind: 'ordered', start: 5 })).toEqual({ type: 'MARKDOWN', attrs: { kind: 'ordered' } });
  });
});
