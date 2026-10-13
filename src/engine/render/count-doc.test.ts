import { describe, expect, it, vi } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import { createEditor } from '../extension/editor';
import { coreExtensions } from '../extension/core-extensions';
import { defineExtension } from '../extension/define-extension';
import { updateBlock } from '../model/doc';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import type { BlockSpec } from '../schema/types';
import { textSelection } from '../state/selection';
import { countDoc, countText } from './count-text';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const docOf = (blocks: readonly QuoinBlock[], schema = createSchema()) => createBlockCodec(schema).docFromBlocks(blocks);

const fixtures: Record<string, QuoinBlock[]> = {
  words: [md('a', 'Hello brave new world')],
  'no spaces': [md('a', 'nospacesatall')],
  'only spaces': [md('a', '   ')],
  empty: [md('a', '')],
  cjk: [md('a', '我爱北京天安门'), md('b', 'こんにちは 世界')],
  emoji: [md('a', 'a👍🏽 and 👨‍👩‍👧 ok')],
  mixed: [
    { id: 'a', type: 'MARKDOWN', data: { markdown: '# Hello **world**' } },
    { id: 'b', type: 'MARKDOWN', data: { markdown: '- ask [@Ada](mention:1)' } },
    { id: 'c', type: 'TABLE', data: { rows: [['x', 'y']], header: false, align: [null, null] } },
    { id: 'd', type: 'DIVIDER', data: {} },
    { id: 'e', type: 'CODE', data: { language: 'ts', code: 'const a = 1;\nconst b = 2;' } },
    { id: 'f', type: 'IMAGE', data: { storageKey: 'k', alt: 'a picture', caption: 'with a caption' } },
    { id: 'g', type: 'CALLOUT', data: { tone: 'info', body: 'callout *body* text' } },
  ],
  legacy: [md('a', 'First paragraph.\n\n- item one\n- item two\n\nLast paragraph here.')],
  none: [],
};

describe('countDoc', () => {
  it.each(Object.keys(fixtures))('counts the %s fixture as countText does', (name) => {
    const blocks = fixtures[name];
    expect(countDoc(docOf(blocks))).toEqual(countText(blocks));
  });

  it('counts the characters and words of a known document', () => {
    expect(countDoc(docOf(fixtures.mixed))).toEqual(countText(fixtures.mixed));
    expect(countDoc(docOf(fixtures.words))).toEqual({ characters: 21, words: 4 });
    expect(countDoc(docOf(fixtures.emoji))).toEqual({ characters: 11, words: 3 });
  });

  it('reads atoms and custom block text from the schema it is given', () => {
    const note: BlockSpec = {
      type: 'NOTE',
      flow: 'void',
      fromData: (data) => ({ attrs: { body: String(data.body) }, regions: {} }),
      toData: ({ attrs }) => ({ body: attrs.body }),
      initial: () => ({ attrs: { body: '' }, regions: {} }),
      toPlainText: ({ attrs }) => String(attrs.body),
    };
    const schema = createSchema({ blocks: [note] });
    const blocks: QuoinBlock[] = [{ id: 'n', type: 'NOTE', data: { body: 'two words' } }];
    expect(countDoc(docOf(blocks, schema), { schema })).toEqual({ characters: 9, words: 2 });
    expect(countText(blocks, { schema })).toEqual({ characters: 9, words: 2 });
    expect(countDoc(docOf(blocks))).toEqual({ characters: 0, words: 0 });
  });

  it('keeps the countText result for the same blocks on every call', () => {
    expect(countText(fixtures.mixed)).toEqual(countText(fixtures.mixed));
    expect(countText([])).toEqual({ characters: 0, words: 0 });
  });
});

describe('countDoc cache', () => {
  const countingSchema = () => {
    const toPlainText = vi.fn(({ attrs }: EngineBlock) => String(attrs.body));
    const note: BlockSpec = {
      type: 'NOTE',
      flow: 'void',
      fromData: (data) => ({ attrs: { body: String(data.body) }, regions: {} }),
      toData: ({ attrs }) => ({ body: attrs.body }),
      initial: () => ({ attrs: { body: '' }, regions: {} }),
      toPlainText,
    };
    return { schema: createSchema({ blocks: [note] }), toPlainText };
  };
  const notes = (count: number): QuoinBlock[] =>
    Array.from({ length: count }, (_, i) => ({ id: `n${i}`, type: 'NOTE', data: { body: `note number ${i}` } }));

  it('recounts only the blocks it has not seen', () => {
    const { schema, toPlainText } = countingSchema();
    const doc = docOf(notes(50), schema);
    const first = countDoc(doc, { schema });
    expect(toPlainText).toHaveBeenCalledTimes(50);
    expect(countDoc(doc, { schema })).toEqual(first);
    expect(toPlainText).toHaveBeenCalledTimes(50);
    const edited = updateBlock(doc, 'n7', (block) => ({ ...block, attrs: { ...block.attrs, body: 'a much longer note body now' } }));
    const second = countDoc(edited, { schema });
    expect(toPlainText).toHaveBeenCalledTimes(51);
    expect(second.characters).toBe(first.characters - 'note number 7'.length + 'a much longer note body now'.length);
    expect(second.words).toBe(first.words - 3 + 6);
  });

  it('never returns a stale count for an edited block, and counts the old block again as it was', () => {
    const { schema } = countingSchema();
    const doc = docOf(notes(3), schema);
    const original = countDoc(doc, { schema });
    const edited = updateBlock(doc, 'n1', (block) => ({ ...block, attrs: { body: 'x' } }));
    expect(countDoc(edited, { schema })).toEqual({ characters: original.characters - 'note number 1'.length + 1, words: original.words - 2 });
    expect(countDoc(doc, { schema })).toEqual(original);
  });

  it('keeps one cache per schema, so the same block counts differently under another schema', () => {
    const first = countingSchema().schema;
    const second = createSchema({
      blocks: [
        {
          type: 'NOTE',
          flow: 'void',
          fromData: (data) => ({ attrs: { body: String(data.body) }, regions: {} }),
          toData: ({ attrs }) => ({ body: attrs.body }),
          initial: () => ({ attrs: { body: '' }, regions: {} }),
          toPlainText: () => 'x',
        },
      ],
    });
    const doc = docOf(notes(1), first);
    expect(countDoc(doc, { schema: first })).toEqual({ characters: 13, words: 3 });
    expect(countDoc(doc, { schema: second })).toEqual({ characters: 1, words: 1 });
  });

  it('does not change the document it counts', () => {
    const doc = docOf(fixtures.mixed);
    const snapshot = JSON.stringify(doc.blocks);
    countDoc(doc);
    expect(JSON.stringify(doc.blocks)).toBe(snapshot);
  });
});

describe('Editor.stats', () => {
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split(' ');
  const thousand = (): QuoinBlock[] =>
    Array.from({ length: 1000 }, (_, i) =>
      md(`b${i}`, `${i % 3 ? '' : '- '}${Array.from({ length: 12 }, (_, j) => words[(i + j) % words.length]).join(' ')} **bold** [l](https://x)`),
    );

  it('counts the document and follows every edit', () => {
    const editor = createEditor({ blocks: [md('a', 'one two'), md('b', 'three')], isMac: true });
    expect(editor.stats()).toEqual({ characters: 'one twothree'.length, words: 3 });
    editor.commands.setSelection(textSelection({ block: 'b', region: 'text', offset: 5 }));
    editor.insertText(' four five');
    expect(editor.stats()).toEqual({ characters: 'one twothree four five'.length, words: 5 });
    editor.commands.undo();
    expect(editor.stats()).toEqual({ characters: 'one twothree'.length, words: 3 });
    editor.commands.redo();
    expect(editor.stats()).toEqual({ characters: 'one twothree four five'.length, words: 5 });
  });

  it('equals countText of the emitted blocks', () => {
    const editor = createEditor({ blocks: fixtures.mixed, isMac: true });
    expect(editor.stats()).toEqual(countText(editor.getBlocks()));
  });

  it('counts with the schema of the editor extensions', () => {
    const note: BlockSpec = {
      type: 'NOTE',
      flow: 'void',
      fromData: (data) => ({ attrs: { body: String(data.body) }, regions: {} }),
      toData: ({ attrs }) => ({ body: attrs.body }),
      initial: () => ({ attrs: { body: '' }, regions: {} }),
      toPlainText: ({ attrs }) => String(attrs.body),
    };
    const editor = createEditor({
      blocks: [{ id: 'n', type: 'NOTE', data: { body: 'two words' } }],
      extensions: [...coreExtensions(), defineExtension({ name: 'note', blocks: [note] })],
      isMac: true,
    });
    expect(editor.stats()).toEqual({ characters: 9, words: 2 });
  });

  it('recounts one edited block of a 1,000 block document in well under a millisecond', () => {
    const editor = createEditor({ blocks: thousand(), isMac: true });
    editor.commands.setSelection(textSelection({ block: 'b500', region: 'text', offset: 3 }));
    editor.stats();
    const timings: number[] = [];
    for (let run = 0; run < 25; run++) {
      editor.insertText('x');
      const start = performance.now();
      editor.stats();
      timings.push(performance.now() - start);
    }
    expect(Math.min(...timings)).toBeLessThan(1);
    expect(editor.stats()).toEqual(countText(editor.getBlocks()));
  });
});
