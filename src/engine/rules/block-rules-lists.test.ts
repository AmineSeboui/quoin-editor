import { describe, expect, it } from 'vitest';
import { historyPlugin, undoInputRule } from '../state/history';
import { buildState, markdownOf, newIds, run } from '../test-support/build-state';
import { blockInputRules } from './block-rules';
import { insertTextWithRules } from './input-rule';

const ITEMS = { bullet: '- ', ordered: '1. ', task: '- [ ] ' } as const;
const INDENTS = [0, 2];

const literal = (text: string) => text.replace(/[#>\-[\]$`.]/g, '\\$&');

function typeAfter(line: string, prefix: string, value = ' ', indent = 0) {
  const entry = { id: 'x', type: 'MARKDOWN', data: { markdown: `${line}${literal(prefix)}` }, indent };
  const state = buildState([entry], { block: 0, offset: prefix.length }, { plugins: [historyPlugin()] });
  return run(state, insertTextWithRules(value, blockInputRules, { newId: newIds() })).state;
}

describe('block rules in list items', () => {
  describe.each(Object.entries(ITEMS))('in a %s item', (kind, marker) => {
    describe.each(INDENTS)('at indent %j', (indent) => {
      const pad = '  '.repeat(indent);
      const expectConverted = (prefix: string, expected: string) => {
        const state = typeAfter(marker, prefix.slice(0, -1), ' ', indent);
        expect(markdownOf(state)).toEqual([pad + expected]);
        expect(state.doc.blocks[0].id).toBe('b0');
        expect(state.doc.blocks[0].indent).toBe(indent);
      };

      it('turns "# " into a level 1 heading', () => expectConverted('# ', '# '));
      it('turns "### " into a level 3 heading', () => expectConverted('### ', '### '));
      it('turns "> " into a quote', () => expectConverted('> ', '> '));

      if (kind !== 'ordered') it('turns "1. " into a numbered item', () => expectConverted('1. ', '1. '));
      if (kind !== 'bullet') it('turns "- " into a bullet', () => expectConverted('- ', '- '));
      if (kind !== 'task') it('turns "[] " into a task', () => expectConverted('[] ', '- [ ] '));
    });
  });

  it.each([
    ['bullet', '- ', '-'],
    ['ordered', '1. ', '1.'],
    ['task', '- [ ] ', '[]'],
  ])('leaves a %s item alone when its own prefix is typed', (kind, marker, prefix) => {
    const state = typeAfter(marker, prefix);
    expect(state.doc.blocks[0].attrs.kind).toBe(kind);
    expect(markdownOf(state)).toEqual(markdownOf(buildState([`${marker}${literal(prefix)}&#32;`])));
  });

  it.each(Object.entries(ITEMS))('carries only the attributes of the new kind out of a %s item', (_kind, marker) => {
    const heading = typeAfter(marker, '##').doc.blocks[0].attrs;
    expect(heading).toEqual({ kind: 'heading', level: 2 });
    const quote = typeAfter(marker, '>').doc.blocks[0].attrs;
    expect(quote).toEqual({ kind: 'quote' });
  });

  it('does not carry a checked state or a start number into the new kind', () => {
    expect(typeAfter('- [x] ', '1.').doc.blocks[0].attrs).toEqual({ kind: 'ordered', start: 1 });
    expect(typeAfter('3. ', '[]').doc.blocks[0].attrs).toEqual({ kind: 'task', checked: false });
    expect(typeAfter('3. ', '-').doc.blocks[0].attrs).toEqual({ kind: 'bullet' });
  });

  describe.each(INDENTS)('undoInputRule at indent %j', (indent) => {
    it.each(Object.entries(ITEMS))('restores a %s item and the typed prefix', (kind, marker) => {
      const converted = typeAfter(marker, '#', ' ', indent);
      expect(markdownOf(converted)).toEqual(['  '.repeat(indent) + '# ']);
      const undone = run(converted, undoInputRule).state;
      expect(markdownOf(undone)).toEqual(['  '.repeat(indent) + `${marker}\\#&#32;`]);
      expect(undone.doc.blocks[0].attrs.kind).toBe(kind);
      expect(undone.doc.blocks[0].indent).toBe(indent);
    });
  });

  it('restores a checked task and the typed prefix after it became a numbered item', () => {
    const converted = typeAfter('- [x] ', '1.');
    expect(converted.doc.blocks[0].attrs).toEqual({ kind: 'ordered', start: 1 });
    const undone = run(converted, undoInputRule).state;
    expect(undone.doc.blocks[0].attrs).toMatchObject({ kind: 'task', checked: true });
    expect(markdownOf(undone)).toEqual(['- [x] 1\\.&#32;']);
  });

  it.each([
    ['divider', '--', '-'],
    ['math', '$$', ' '],
    ['code', '```', ' '],
  ])('keeps the %s rule to paragraphs', (_name, prefix, value) => {
    const state = typeAfter('- ', prefix, value);
    expect(state.doc.blocks.map((block) => [block.type, block.attrs.kind])).toEqual([['MARKDOWN', 'bullet']]);
  });
});
