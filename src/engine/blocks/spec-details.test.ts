import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';
import { cellKey } from './table-spec';
import { specFor, unknownBlockSpec } from './unknown-spec';

const schema = createSchema();
const codec = createBlockCodec(schema, { newId: () => 'new' });
const fromData = (type: string, data: Record<string, unknown>) =>
  codec.toEngineBlocks({ id: 'x', type, data })[0];
const toData = (block: EngineBlock) => codec.toQuoin({ ...block }).data;
const withAttrs = (block: EngineBlock, attrs: Record<string, unknown>): EngineBlock => ({
  ...block,
  attrs: { ...block.attrs, ...attrs },
});

describe('initial content', () => {
  const initial = (type: string) => schema.blocks.get(type)!.initial();

  it('starts MARKDOWN as an empty paragraph', () => {
    expect(initial('MARKDOWN')).toEqual({ attrs: { kind: 'paragraph' }, regions: { text: [] } });
  });

  it('starts every other core type empty', () => {
    expect(initial('CALLOUT')).toEqual({ attrs: { tone: 'info' }, regions: { body: [] } });
    expect(initial('CODE')).toEqual({ attrs: { language: '', code: '' }, regions: {} });
    expect(initial('IMAGE')).toEqual({ attrs: { storageKey: '', alt: '' }, regions: { caption: [] } });
    expect(initial('FILE')).toEqual({ attrs: { storageKey: '', filename: '' }, regions: {} });
    expect(initial('TOGGLE')).toEqual({ attrs: { open: true }, regions: { text: [] } });
    expect(initial('EMBED')).toEqual({ attrs: { url: '', provider: '' }, regions: {} });
    expect(initial('BOOKMARK')).toEqual({ attrs: { url: '' }, regions: {} });
    expect(initial('MATH')).toEqual({ attrs: { latex: '' }, regions: {} });
    expect(initial('DIVIDER')).toEqual({ attrs: {}, regions: {} });
    expect(initial('TOC')).toEqual({ attrs: {}, regions: {} });
  });

  it('starts TABLE as three rows of two empty cells under a header', () => {
    const { attrs, regions } = initial('TABLE');
    expect(attrs).toEqual({ header: true, align: [null, null], rows: 3, cols: 2 });
    expect(Object.keys(regions)).toEqual(['cell:0:0', 'cell:0:1', 'cell:1:0', 'cell:1:1', 'cell:2:0', 'cell:2:1']);
    expect(Object.values(regions).every((cell) => cell.length === 0)).toBe(true);
  });

  it('writes the initial content of each type as data that reads back the same', () => {
    for (const [type, spec] of schema.blocks) {
      const block: EngineBlock = { id: 'i', type, indent: 0, ...spec.initial() };
      const back = fromData(type, toData(block));
      expect(back.attrs, type).toEqual(block.attrs);
      expect(back.regions, type).toEqual(block.regions);
    }
  });
});

describe('flow and entry behaviour', () => {
  it.each([
    ['MARKDOWN', 'text', 'text'],
    ['CALLOUT', 'text', 'body'],
    ['TOGGLE', 'text', 'text'],
    ['IMAGE', 'structured', undefined],
    ['TABLE', 'structured', undefined],
    ['CODE', 'void', undefined],
    ['FILE', 'void', undefined],
    ['DIVIDER', 'void', undefined],
    ['EMBED', 'void', undefined],
    ['BOOKMARK', 'void', undefined],
    ['MATH', 'void', undefined],
    ['TOC', 'void', undefined],
  ])('%s has the %s flow and primary region %s', (type, flow, primaryRegion) => {
    expect(schema.blocks.get(type)).toMatchObject({ flow });
    expect(schema.blocks.get(type)!.primaryRegion).toBe(primaryRegion);
  });

  it('breaks a callout line with a hard break and splits the others', () => {
    expect(schema.blocks.get('CALLOUT')!.enter).toBe('hardBreak');
    expect(schema.blocks.get('MARKDOWN')!.enter).toBeUndefined();
  });

  it('splits a toggle into a plain paragraph', () => {
    expect(schema.blocks.get('TOGGLE')!.splitAttrs!({ open: true })).toEqual({
      type: 'MARKDOWN',
      attrs: { kind: 'paragraph' },
    });
  });
});

describe('host data that the core does not know', () => {
  it.each([
    ['MARKDOWN', { markdown: 'x', note: { a: 1 } }],
    ['CALLOUT', { tone: 'info', body: '', note: [1] }],
    ['CODE', { language: '', code: '', note: 'n' }],
    ['IMAGE', { storageKey: '', alt: '', note: true }],
    ['FILE', { storageKey: '', filename: '', note: 0 }],
    ['DIVIDER', { note: 'd' }],
    ['TOGGLE', { markdown: '', open: false, note: 1 }],
    ['TABLE', { rows: [['a']], header: true, align: [null], note: 1 }],
    ['EMBED', { url: '', provider: '', note: 1 }],
    ['BOOKMARK', { url: '', note: 1 }],
    ['MATH', { latex: '', note: 1 }],
    ['TOC', { note: 1 }],
  ])('%s writes the extra fields back', (type, data) => {
    expect(toData(fromData(type, data))).toEqual(data);
  });

  it('keeps an extra field named like a prototype key as an own property', () => {
    const data = JSON.parse('{"markdown":"x","__proto__":{"polluted":true}}');
    const out = toData(fromData('MARKDOWN', data));
    expect(Object.keys(out)).toContain('__proto__');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
  });
});

describe('MARKDOWN data', () => {
  const write = (attrs: Record<string, unknown>, ...nodes: ReturnType<typeof text>[]) =>
    toData({ id: 'x', type: 'MARKDOWN', indent: 0, attrs, regions: { text: nodes } }).markdown;

  it('writes the canonical prefix of every kind', () => {
    expect(write({ kind: 'paragraph' }, text('a'))).toBe('a');
    expect(write({ kind: 'heading', level: 4 }, text('a'))).toBe('#### a');
    expect(write({ kind: 'bullet' }, text('a'))).toBe('- a');
    expect(write({ kind: 'ordered', start: 9 }, text('a'))).toBe('9. a');
    expect(write({ kind: 'task', checked: false }, text('a'))).toBe('- [ ] a');
    expect(write({ kind: 'quote' }, text('a'))).toBe('> a');
  });

  it('writes a paragraph for a missing or unknown kind', () => {
    expect(write({}, text('a'))).toBe('a');
    expect(write({ kind: 'diagram' }, text('a'))).toBe('a');
  });

  it('writes an empty region as the bare prefix', () => {
    expect(write({ kind: 'bullet' })).toBe('- ');
    expect(write({ kind: 'paragraph' })).toBe('');
  });

  it('escapes text that would read back as block syntax', () => {
    expect(write({ kind: 'paragraph' }, text('# not a heading'))).toBe('\\# not a heading');
    expect(write({ kind: 'bullet' }, text('[ ] not a task'))).toBe('- \\[ \\] not a task');
    expect(write({ kind: 'quote' }, text('1. not a list'))).toBe('> 1\\. not a list');
  });

  it('keeps a trailing hash run of a heading out of the closing sequence', () => {
    expect(write({ kind: 'heading', level: 1 }, text('foo #'))).toBe('# foo \\#');
    expect(write({ kind: 'heading', level: 2 }, text('foo ###'))).toBe('## foo \\###');
    expect(write({ kind: 'heading', level: 1 }, text('C#'))).toBe('# C#');
    expect(write({ kind: 'paragraph' }, text('foo #'))).toBe('foo #');
  });

  it('reads attrs only for the kind it parsed', () => {
    expect(fromData('MARKDOWN', { markdown: '2) b' }).attrs).toEqual({ kind: 'ordered', start: 2 });
    expect(fromData('MARKDOWN', { markdown: '- [X] b' }).attrs).toEqual({ kind: 'task', checked: true });
    expect(fromData('MARKDOWN', { markdown: '' }).attrs).toEqual({ kind: 'paragraph' });
    expect(fromData('MARKDOWN', {}).regions.text).toEqual([]);
  });

  it('keeps the palette names and drops anything else', () => {
    expect(fromData('MARKDOWN', { markdown: 'x', color: 'default', background: 'pink' }).attrs).toEqual({
      kind: 'paragraph',
      color: 'default',
      background: 'pink',
    });
    expect(fromData('MARKDOWN', { markdown: 'x', color: 3, background: '#fff' }).attrs).toEqual({ kind: 'paragraph' });
  });

  it('splits every kind with its alignment and nothing else', () => {
    const split = schema.blocks.get('MARKDOWN')!.splitAttrs!;
    expect(split({ kind: 'bullet', align: 'right', background: 'red', extra: { a: 1 } }).attrs).toEqual({
      kind: 'bullet',
      align: 'right',
    });
    expect(split({ kind: 'quote' }).attrs).toEqual({ kind: 'quote' });
    expect(split({ kind: 'paragraph', align: 'sideways' }).attrs).toEqual({ kind: 'paragraph' });
  });
});

describe('IMAGE and FILE data', () => {
  it('writes the caption only when it has content', () => {
    expect(toData(fromData('IMAGE', { storageKey: 'k', alt: '', caption: '' }))).toEqual({ storageKey: 'k', alt: '' });
    expect(fromData('IMAGE', { storageKey: 'k', alt: '' }).regions.caption).toEqual([]);
    expect(fromData('IMAGE', { caption: 'a **b**' }).regions.caption).toHaveLength(2);
  });

  it('drops numbers and alignments of the wrong type', () => {
    const data = { storageKey: 'k', alt: 'a', width: '10', height: Number.NaN, widthPercent: Infinity, align: 'top', url: 4 };
    expect(toData(fromData('IMAGE', data))).toEqual({ storageKey: 'k', alt: 'a' });
  });

  it('keeps an empty optional string and a zero width', () => {
    const data = { storageKey: '', alt: '', url: '', width: 0 };
    expect(toData(fromData('IMAGE', data))).toEqual(data);
  });

  it('keeps the file size and mime type', () => {
    const data = { storageKey: 'k', filename: 'a.pdf', size: 0, mime: 'application/pdf' };
    expect(toData(fromData('FILE', data))).toEqual(data);
    expect(toData(fromData('FILE', { storageKey: 'k', filename: 'a', size: 'big', mime: 1 }))).toEqual({
      storageKey: 'k',
      filename: 'a',
    });
  });
});

describe('TOGGLE and CALLOUT data', () => {
  it('reads a toggle as closed unless it says it is open', () => {
    expect(fromData('TOGGLE', { markdown: 'a' }).attrs).toEqual({ open: false });
    expect(fromData('TOGGLE', { markdown: 'a', open: 'yes' }).attrs).toEqual({ open: false });
    expect(toData(fromData('TOGGLE', { markdown: 'a' }))).toEqual({ markdown: 'a', open: false });
  });

  it('writes a callout tone and body even when the data lacks them', () => {
    expect(toData(fromData('CALLOUT', {}))).toEqual({ tone: '', body: '' });
  });
});

describe('TABLE data', () => {
  it('holds one region per cell parsed with soft breaks as spaces', () => {
    const block = fromData('TABLE', { rows: [['a\nb', '**c**'], ['', 'd']], header: false, align: ['right', 'center'] });
    expect(block.attrs).toEqual({ header: false, align: ['right', 'center'], rows: 2, cols: 2 });
    expect(Object.keys(block.regions)).toEqual([cellKey(0, 0), cellKey(0, 1), cellKey(1, 0), cellKey(1, 1)]);
    expect(block.regions[cellKey(0, 0)]).toEqual([text('a b')]);
    expect(block.regions[cellKey(0, 1)]).toEqual([text('c', [{ type: 'bold' }])]);
    expect(block.regions[cellKey(1, 0)]).toEqual([]);
  });

  it('pads short rows and short alignment lists to the widest row', () => {
    const block = fromData('TABLE', { rows: [['a'], ['b', 'c', 'd']], align: ['left'] });
    expect(block.attrs).toMatchObject({ rows: 2, cols: 3, align: ['left', null, null] });
    expect(toData(block)).toEqual({
      rows: [['a', '', ''], ['b', 'c', 'd']],
      header: true,
      align: ['left', null, null],
    });
  });

  it('keeps widths that are numbers and writes them back', () => {
    const data = { rows: [['a', 'b']], header: true, align: [null, null], widths: [120, 80.5] };
    expect(toData(fromData('TABLE', data))).toEqual(data);
    expect(toData(fromData('TABLE', { ...data, widths: [120, 'wide'] }))).toEqual({ rows: [['a', 'b']], header: true, align: [null, null] });
  });

  it('normalizes column alignments to left, centre, right or none', () => {
    const block = fromData('TABLE', { rows: [['a', 'b', 'c', 'd']], align: ['justify', 'left', 7, 'right'] });
    expect(block.attrs.align).toEqual([null, 'left', null, 'right']);
  });

  it('reads a table without rows as empty and a missing header as present', () => {
    const block = fromData('TABLE', { rows: 'none' });
    expect(block.attrs).toMatchObject({ rows: 0, cols: 0, header: true, align: [] });
    expect(toData(block)).toEqual({ rows: [], header: true, align: [] });
    expect(fromData('TABLE', { rows: [[1, null]] }).regions[cellKey(0, 1)]).toEqual([]);
  });

  it('reads rows and cols of the wrong type as zero when it writes', () => {
    const block = withAttrs(fromData('TABLE', { rows: [['a']] }), { rows: 'two', cols: -1 });
    expect(toData(block)).toMatchObject({ rows: [] });
  });

  it('escapes pipes and writes hard breaks as br in cells', () => {
    const block = fromData('TABLE', { rows: [['a']] });
    const edited = { ...block, regions: { [cellKey(0, 0)]: [text('x|y\nz')] } };
    expect(toData(edited).rows).toEqual([['x\\|y<br>z']]);
  });
});

describe('unknown block types', () => {
  it('keeps the data object as the only attr', () => {
    const data = { a: 1 };
    const spec = unknownBlockSpec('PLUGIN');
    expect(spec).toMatchObject({ type: 'PLUGIN', flow: 'void' });
    expect(spec.fromData(data, codec.context)).toEqual({ attrs: { data }, regions: {} });
    expect(spec.initial()).toEqual({ attrs: { data: {} }, regions: {} });
  });

  it('writes the exact data object back, or an empty one without it', () => {
    const data = { a: 1 };
    const block = { id: 'x', type: 'PLUGIN', indent: 0, attrs: { data }, regions: {} };
    expect(unknownBlockSpec('PLUGIN').toData(block, codec.context)).toBe(data);
    expect(unknownBlockSpec('PLUGIN').toData({ ...block, attrs: {} }, codec.context)).toEqual({});
  });

  it('is what specFor returns for a type the schema does not hold', () => {
    expect(specFor(schema, 'MARKDOWN')).toBe(schema.blocks.get('MARKDOWN'));
    expect(specFor(schema, 'PLUGIN')).toMatchObject({ type: 'PLUGIN', flow: 'void' });
    expect(specFor(schema, 'constructor')).toMatchObject({ type: 'constructor', flow: 'void' });
  });
});
