import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { text } from '../engine/model/inline';
import { readShared } from './read-shared';
import { heldPlainly } from './test-support/layout-shape';
import { writeTokens, type Token } from './test-support/tokens';

const marker = (id: unknown, type = 'MARKDOWN'): Token => ({ kind: 'marker', id, type, indent: 0, attrs: null });
const region = (name: unknown): Token => ({ kind: 'region', name });
const chars = (value: string): Token => ({ kind: 'text', value, bold: false });

function read(...tokens: Token[]) {
  const shared = new Y.Doc().getText('quoin');
  writeTokens(shared, tokens);
  return readShared(shared);
}

const regionsOf = (...tokens: Token[]) =>
  read(...tokens).doc.blocks.map(({ id, regions }) => [id, Object.keys(regions).map((name) => [name, regions[name]])]);

describe('the document every client reads from a shared text', () => {
  it('is the blocks in marker order, each with its regions in order', () => {
    const { doc, layout } = read(marker('a'), region('text'), chars('one'), marker('d', 'DIVIDER'), marker('b'));
    expect(doc.blocks).toEqual([
      { id: 'a', type: 'MARKDOWN', indent: 0, attrs: {}, regions: { text: [text('one')] } },
      { id: 'd', type: 'DIVIDER', indent: 0, attrs: {}, regions: {} },
      { id: 'b', type: 'MARKDOWN', indent: 0, attrs: {}, regions: {} },
    ]);
    expect(heldPlainly(layout)).toBe(true);
  });

  it('gives text before the first marker to the first region of the document', () => {
    expect(regionsOf(chars('early '), marker('d', 'DIVIDER'), marker('a'), region('text'), chars('one'))).toEqual([
      ['d', []],
      ['a', [['text', [text('early one')]]]],
    ]);
  });

  it('gives text outside a region to the region before it', () => {
    expect(
      regionsOf(marker('a'), region('text'), chars('one'), marker('d', 'DIVIDER'), chars(' two'), marker('b'), chars('!'), region('text')),
    ).toEqual([
      ['a', [['text', [text('one two!')]]]],
      ['d', []],
      ['b', [['text', []]]],
    ]);
  });

  it('drops text no region comes before or after', () => {
    expect(regionsOf(chars('lost'), marker('d', 'DIVIDER'), chars('lost'))).toEqual([['d', []]]);
    expect(read(chars('lost')).doc.blocks).toEqual([]);
  });

  it('keeps the first block of an id and leaves out later markers of it with all they hold', () => {
    expect(
      regionsOf(marker('a'), region('text'), chars('one'), marker('a'), region('text'), chars('copy'), marker('b'), region('text')),
    ).toEqual([
      ['a', [['text', [text('one')]]]],
      ['b', [['text', []]]],
    ]);
  });

  it('leaves out a marker with no id that is a string', () => {
    expect(regionsOf(marker('a'), region('text'), chars('one'), marker(7), region('text'), chars('two'))).toEqual([
      ['a', [['text', [text('one')]]]],
    ]);
  });

  it('continues the region before a region start whose name the block has, or that has no name', () => {
    expect(
      regionsOf(marker('a'), region('text'), chars('one'), region('body'), chars('two'), region('text'), chars('three'), region(3), chars('!')),
    ).toEqual([['a', [['text', [text('one')]], ['body', [text('twothree!')]]]]]);
  });

  it('skips embeds it does not know, and the marks of markers and region starts', () => {
    const { doc, layout } = read(marker('a'), region('text'), chars('on'), { kind: 'embed' }, chars('e'));
    expect(doc.blocks[0].regions).toEqual({ text: [text('one')] });
    expect(heldPlainly(layout)).toBe(false);
  });

  it('reads missing fields of a marker as an untyped, unindented block with no attrs', () => {
    const { doc } = read({ kind: 'marker', id: 'a', type: undefined, indent: 'x', attrs: null });
    expect(doc.blocks).toEqual([{ id: 'a', type: '', indent: 0, attrs: {}, regions: {} }]);
  });
});
