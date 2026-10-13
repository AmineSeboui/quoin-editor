import { describe, expect, it } from 'vitest';
import { historyPlugin, undoInputRule } from '../state/history';
import { buildState, caretOf, run } from '../test-support/build-state';
import { insertTextWithRules } from './input-rule';
import { markInputRules } from './mark-rules';

type Entry = Parameters<typeof buildState>[0][number];

const typeSpace = (entry: Entry, offset: number, value = ' ') =>
  run(buildState([entry], { block: 0, offset }, { plugins: [historyPlugin()] }), insertTextWithRules(value, markInputRules));
const linksOf = (state: ReturnType<typeof buildState>) =>
  state.doc.blocks[0].regions.text.flatMap((node) => {
    const link = node.marks.find((mark) => mark.type === 'link');
    return link === undefined || node.kind !== 'text' ? [] : [[node.text, link.attrs?.href]];
  });
const linked = (paragraph: string) => linksOf(typeSpace({ paragraph }, paragraph.length).state);

describe('autolink rule', () => {
  it.each([
    ['https://a.b/c', [['https://a.b/c', 'https://a.b/c']]],
    ['http://localhost:3000/x?y=1#z', [['http://localhost:3000/x?y=1#z', 'http://localhost:3000/x?y=1#z']]],
    ['HTTPS://A.B', [['HTTPS://A.B', 'HTTPS://A.B']]],
    ['www.example.com/a', [['www.example.com/a', 'https://www.example.com/a']]],
    ['see https://a.b/c', [['https://a.b/c', 'https://a.b/c']]],
    ['(https://a.b', [['https://a.b', 'https://a.b']]],
  ])('links %j', (paragraph, expected) => {
    expect(linked(paragraph)).toEqual(expected);
  });

  it('leaves trailing punctuation outside the link', () => {
    expect(linked('go to https://a.b/c.')).toEqual([['https://a.b/c', 'https://a.b/c']]);
    expect(linked('is it https://a.b?!')).toEqual([['https://a.b', 'https://a.b']]);
    expect(linked('https://a.b/c,')).toEqual([['https://a.b/c', 'https://a.b/c']]);
    expect(linked('"https://a.b"')).toEqual([]);
  });

  it('keeps balanced parentheses and drops an unbalanced closing one', () => {
    expect(linked('https://a.b/x_(y)')).toEqual([['https://a.b/x_(y)', 'https://a.b/x_(y)']]);
    expect(linked('(see https://a.b/x_(y))')).toEqual([['https://a.b/x_(y)', 'https://a.b/x_(y)']]);
    expect(linked('(https://a.b)')).toEqual([['https://a.b', 'https://a.b']]);
  });

  it.each(['xhttps://a.b', 'ftp://a.b', 'https://', 'www.', 'www..', 'a.b/c', 'https://a.b\u0001x'])('does not link %j', (paragraph) => {
    expect(linked(paragraph)).toEqual([]);
  });

  it('only fires on the space that follows the address', () => {
    expect(linksOf(typeSpace({ paragraph: 'https://a.b' }, 11, 'x').state)).toEqual([]);
    expect(linksOf(typeSpace({ paragraph: 'https://a.b/' }, 12, '!').state)).toEqual([]);
  });

  it('leaves the space unlinked and lets typing go on without the link', () => {
    const { state } = typeSpace({ paragraph: 'www.a.b' }, 7);
    expect(caretOf(state)).toEqual({ block: 0, offset: 8 });
    const next = run(state, insertTextWithRules('z', markInputRules)).state;
    expect(linksOf(next)).toEqual([['www.a.b', 'https://www.a.b']]);
    expect(next.doc.blocks[0].regions.text.map((node) => node.marks.length)).toEqual([1, 0]);
  });

  it('does not link text that is already a link or code', () => {
    const state = typeSpace('[https://a.b](https://c.d)', 11).state;
    expect(linksOf(state)).toEqual([['https://a.b', 'https://c.d']]);
    expect(linksOf(typeSpace('`https`://a.b', 11).state)).toEqual([]);
  });

  it('is undone to the typed space', () => {
    const { state } = typeSpace({ paragraph: 'https://a.b' }, 11);
    expect(run(state, undoInputRule).state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'https://a.b ', marks: [] }]);
  });
});
