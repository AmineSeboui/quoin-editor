import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { insertTextWithRules } from './input-rule';
import { markInputRules } from './mark-rules';

type Entry = Parameters<typeof buildState>[0][number];

const type = (entry: Entry, offset: number, value: string) =>
  run(buildState([entry], { block: 0, offset }), insertTextWithRules(value, markInputRules));
const markdown = (paragraph: string, value: string) => markdownOf(type({ paragraph }, paragraph.length, value).state);
const marksOf = (state: ReturnType<typeof buildState>) =>
  state.doc.blocks[0].regions.text.map((node) => [node.kind === 'text' ? node.text : '', node.marks.map((mark) => mark.type)]);

describe('mark input rules in detail', () => {
  it.each([
    ['a __bold_', '_', 'a **bold**'],
    ['**a b*', '*', '**a b**'],
    ['x ~~two words~', '~', 'x ~~two words~~'],
    ['say `a b', '`', 'say `a b`'],
    ['say `a', '`', 'say `a`'],
    ['(*it', '*', '(_it_'],
    ['(_it', '_', '(_it_'],
  ])('%j plus %j gives %j', (paragraph, value, expected) => {
    expect(markdown(paragraph, value)).toEqual([expected]);
  });

  it('removes the delimiters, keeps the text and puts the caret after it', () => {
    const { state } = type({ paragraph: 'a **bold*' }, 9, '*');
    expect(inlineText(state.doc.blocks[0].regions.text)).toBe('a bold');
    expect(marksOf(state)).toEqual([['a ', []], ['bold', ['bold']]]);
    expect(caretOf(state)).toEqual({ block: 0, offset: 6 });
  });

  it('keeps text after the caret outside the mark', () => {
    const { state } = type({ paragraph: '**ab* tail' }, 5, '*');
    expect(marksOf(state)).toEqual([['ab', ['bold']], [' tail', []]]);
  });

  it('keeps the marks that are already inside', () => {
    const { state } = type('~~a **b** c~', 8, '~');
    expect(marksOf(state)).toEqual([['a ', ['strike']], ['b', ['bold', 'strike']], [' c', ['strike']]]);
  });

  it('keeps the marks around when it continues typing after the new mark', () => {
    const typed = type('**a _b**', 8, '_').state;
    expect(marksOf(typed)).toEqual([['a ', ['bold']], ['b', ['bold', 'italic']]]);
    expect(marksOf(run(typed, insertTextWithRules('c', markInputRules)).state)).toEqual([
      ['a ', ['bold']],
      ['b', ['bold', 'italic']],
      ['c', ['bold']],
    ]);
  });

  it('records the typed text for undoInputRule', () => {
    expect(type({ paragraph: '~~a~' }, 4, '~').tr?.getMeta('inputRule')).toEqual({ undoText: '~' });
  });

  it('does not treat spaces at the edge of the content as a mark', () => {
    expect(inlineText(type({ paragraph: '**b *' }, 5, '*').state.doc.blocks[0].regions.text)).toBe('**b **');
    expect(inlineText(type({ paragraph: '` b' }, 3, '`').state.doc.blocks[0].regions.text)).toBe('` b`');
    expect(marksOf(type({ paragraph: '==a =' }, 5, '=').state)).toEqual([['==a ==', []]]);
  });

  it('does not fire for an empty content or a delimiter inside it', () => {
    expect(marksOf(type({ paragraph: '**' }, 2, '*').state)).toEqual([['***', []]]);
    expect(marksOf(type({ paragraph: '*a*' }, 3, '*').state)).toEqual([['*a**', []]]);
  });

  it('does not start italics from the second star of an unfinished bold', () => {
    expect(marksOf(type({ paragraph: '**bold' }, 6, '*').state)).toEqual([['**bold*', []]]);
  });

  it('does not close an underscore mark that is followed by a letter', () => {
    expect(marksOf(type({ paragraph: '_ab' }, 2, '_').state)).toEqual([['_a_b', []]]);
    expect(marksOf(type({ paragraph: '__ab_' }, 5, '_').state)).toEqual([['ab', ['bold']]]);
    expect(marksOf(type({ paragraph: '__a_b' }, 4, '_').state)).toEqual([['__a__b', []]]);
    expect(marksOf(type({ paragraph: '_a b' }, 4, '_').state)).toEqual([['a b', ['italic']]]);
  });

  it('does not use delimiters that are code', () => {
    const { state } = type('`*`foo', 4, '*');
    expect(markdownOf(state)).toEqual(['`*`foo\\*']);
  });

  it('turns a link only when its scheme is safe', () => {
    expect(marksOf(type({ paragraph: '[x](javascript:void' }, 19, ')').state)).toEqual([['[x](javascript:void)', []]]);
    expect(markdown('[x](/docs/a', ')')).toEqual(['[x](/docs/a)']);
    expect(markdown('[x](#top', ')')).toEqual(['[x](#top)']);
    expect(markdown('[x](mailto:a@b.c', ')')).toEqual(['[x](mailto:a@b.c)']);
  });

  it('turns links with marked text and stops the link from continuing', () => {
    const { state } = type({ paragraph: 'see [docs](https://d.e' }, 22, ')');
    expect(marksOf(state)).toEqual([['see ', []], ['docs', ['link']]]);
    expect(markdownOf(run(state, insertTextWithRules('!', markInputRules)).state)).toEqual(['see [docs](https://d.e)!']);
  });

  it('does not fire for links with brackets, spaces or an empty part', () => {
    expect(marksOf(type({ paragraph: '[](https://d.e' }, 14, ')').state)).toEqual([['[](https://d.e)', []]]);
    expect(marksOf(type({ paragraph: '[a](' }, 4, ')').state)).toEqual([['[a]()', []]]);
    expect(marksOf(type({ paragraph: '[a](b c' }, 7, ')').state)).toEqual([['[a](b c)', []]]);
    expect(marksOf(type({ paragraph: '[ a](b' }, 6, ')').state)).toEqual([['[ a](b)', []]]);
  });

  it('works in the text regions of other blocks', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'a ==b=' } };
    const { state } = type(callout, 6, '=');
    expect(state.doc.blocks[0].regions.body.map((node) => node.marks.map((mark) => mark.type))).toEqual([[], ['highlight']]);
  });

  it('works in a table cell', () => {
    const table = { id: 't', type: 'TABLE', data: { rows: [['~~a~', 'b']] } };
    const state = run(buildState([table], { block: 0, region: 'cell:0:0', offset: 4 }), insertTextWithRules('~', markInputRules)).state;
    expect(state.doc.blocks[0].regions['cell:0:0'].map((node) => node.marks.map((mark) => mark.type))).toEqual([['strike']]);
  });
});
