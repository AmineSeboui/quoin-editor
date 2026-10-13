import { describe, expect, it } from 'vitest';
import { historyPlugin, undoInputRule } from '../state/history';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { insertTextWithRules } from './input-rule';
import { typographyRules } from './typography';

const type = (paragraph: string, value: string, dashes?: 'em' | 'en' | 'none') =>
  markdownOf(run(buildState([{ paragraph }], { block: 0, offset: paragraph.length }), insertTextWithRules(value, typographyRules({ dashes }))).state)[0];

describe('typography', () => {
  it.each([
    ['wait..', '.', 'wait\u2026'],
    ['a -', '>', 'a \u2192'],
    ['(c', ')', '\u00A9'],
    ['1/', '2', '\u00BD'],
    ['say ', '"', 'say \u201C'],
    ['say \u201Chi', '"', 'say \u201Chi\u201D'],
    ['it', "'", 'it\u2019'],
  ])('%j plus %j gives %j', (paragraph, value, expected) => expect(type(paragraph, value)).toBe(expected));

  it('leaves dashes alone unless asked', () => {
    expect(type('a -', '-')).toBe('a --');
    expect(type('a -', '-', 'en')).toBe('a \u2013');
    expect(type('a -', '-', 'em')).toBe('a \u2014');
  });

  it.each([
    ['(r', ')', '\u00AE'],
    ['(tm', ')', '\u2122'],
    ['a <', '-', 'a \u2190'],
    ['a =', '>', 'a \u21D2'],
    ['1/', '4', '\u00BC'],
    ['3/', '4', '\u00BE'],
    ['half 1/', '2', 'half \u00BD'],
  ])('%j plus %j gives %j', (paragraph, value, expected) => expect(type(paragraph, value)).toBe(expected));

  it.each([
    ['11/', '2'],
    ['a/1/', '2'],
    ['13/', '4'],
  ])('keeps %j plus %j as typed because the digit belongs to a longer number', (paragraph, value) => {
    expect(type(paragraph, value)).toBe(paragraph + value);
  });

  it('only turns the lower case (c), (r) and (tm)', () => {
    expect(type('(C', ')')).toBe('(C)');
    expect(type('(R', ')')).toBe('(R)');
    expect(type('(TM', ')')).toBe('(TM)');
  });

  it.each([
    ['', '"', '\u201C'],
    ['(', '"', '(\u201C'],
    ['\u201C', '"', '\u201C\u201C'],
    ['a\u2014', '"', 'a\u2014\u201C'],
    ['say "hi', '"', 'say "hi\u201D'],
    ['hi.', '"', 'hi.\u201D'],
    ['', "'", '\u2018'],
    ['say ', "'", 'say \u2018'],
    ['rock', "'", 'rock\u2019'],
  ])('chooses the quote by the character before it: %j plus %j gives %j', (paragraph, value, expected) => {
    expect(type(paragraph, value)).toBe(expected);
  });

  it('has no dash rule unless asked', () => {
    expect(typographyRules().map((rule) => rule.name)).not.toContain('dash');
    expect(typographyRules({ dashes: 'none' })).toHaveLength(typographyRules().length);
    expect(typographyRules({ dashes: 'em' })).toHaveLength(typographyRules().length + 1);
  });

  it('keeps the marks of the replaced text and puts the caret after it', () => {
    const state = run(buildState(['**wait..**'], { block: 0, offset: 6 }), insertTextWithRules('.', typographyRules())).state;
    expect(state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'wait\u2026', marks: [{ type: 'bold' }] }]);
    expect(caretOf(state)).toEqual({ block: 0, offset: 5 });
  });

  it('never replaces inside code', () => {
    const state = run(buildState(['`a..`'], { block: 0, offset: 3 }), insertTextWithRules('.', typographyRules())).state;
    expect(markdownOf(state)).toEqual(['`a...`']);
  });

  it('works in other text regions', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'a -' } };
    const state = run(buildState([callout], { block: 0, offset: 3 }), insertTextWithRules('>', typographyRules())).state;
    expect(state.doc.blocks[0].regions.body).toEqual([{ kind: 'text', text: 'a \u2192', marks: [] }]);
  });

  it('is undone back to the typed text', () => {
    const typed = run(buildState([{ paragraph: 'wait..' }], { block: 0, offset: 6 }, { plugins: [historyPlugin()] }), insertTextWithRules('.', typographyRules())).state;
    expect(markdownOf(run(typed, undoInputRule).state)).toEqual(['wait...']);
  });
});
