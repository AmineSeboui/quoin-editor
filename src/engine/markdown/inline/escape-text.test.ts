import { describe, expect, it } from 'vitest';
import { escapeText, type EscapeContext } from './escape-text';

const inside: EscapeContext = {
  lineStart: false,
  lineEnd: false,
  escapeLineStart: false,
  escapePipes: false,
  next: '',
};
const at = (overrides: Partial<EscapeContext>): EscapeContext => ({ ...inside, ...overrides });

describe('escapeText', () => {
  it.each(['`', '*', '[', ']', '<', '~', '$'])('always escapes %s', (char) => {
    expect(escapeText(`a${char}b`, inside)).toBe(`a\\${char}b`);
  });

  it.each([
    ['snake_case_name', 'snake_case_name'],
    ['https://example.com/a_b_c?x=1', 'https://example.com/a_b_c?x=1'],
    ['1_000_000', '1_000_000'],
    ['\u00e9_\u00e9', '\u00e9_\u00e9'],
  ])('leaves an underscore between two letters or digits alone in %j', (input, expected) => {
    expect(escapeText(input, inside)).toBe(expected);
  });

  it.each([
    ['_a', '\\_a'],
    ['a_', 'a\\_'],
    ['a_ b', 'a\\_ b'],
    ['a _b', 'a \\_b'],
    ['a__b', 'a\\_\\_b'],
    ['a_*b', 'a\\_\\*b'],
    ['_', '\\_'],
  ])('escapes the underscores of %j', (input, expected) => {
    expect(escapeText(input, inside)).toBe(expected);
  });

  it('escapes an underscore at the edge of its text, whose neighbours it cannot see', () => {
    expect(escapeText('a_', at({ next: 'b' }))).toBe('a\\_');
    expect(escapeText('_b', at({ previous: 'a' }))).toBe('\\_b');
  });

  it.each([
    ['C:\\Users\\me', 'C:\\Users\\me'],
    ['a\\1', 'a\\1'],
    ['\\\u00e9', '\\\u00e9'],
  ])('leaves a backslash before a letter or digit alone in %j', (input, expected) => {
    expect(escapeText(input, inside)).toBe(expected);
  });

  it.each([
    ['a\\', 'a\\\\'],
    ['a\\*', 'a\\\\\\*'],
    ['a\\\\b', 'a\\\\\\b'],
    ['a\\ b', 'a\\\\ b'],
    ['a\\\nb', 'a\\\\\\\nb'],
    ['a\\&b', 'a\\\\&b'],
  ])('escapes the backslashes of %j', (input, expected) => {
    expect(escapeText(input, at({ previous: 'x', following: 'y' }))).toBe(expected);
  });

  it.each(['>', '#', '=', '+', '-', '|', '(', ')', '.', '"', '@'])('leaves %s alone mid line', (char) => {
    expect(escapeText(`a${char}b`, inside)).toBe(`a${char}b`);
  });

  it('escapes an ampersand only when an entity could follow it', () => {
    expect(escapeText('&amp; &#35; &#x41; &copy;', inside)).toBe('\\&amp; \\&#35; \\&#x41; \\&copy;');
    expect(escapeText('a&b & c &; &#;', inside)).toBe('a&b & c &; &#;');
  });

  it('escapes an exclamation mark that would turn a bracket into an image', () => {
    expect(escapeText('![', inside)).toBe('\\!\\[');
    expect(escapeText('hi!', at({ next: '[' }))).toBe('hi\\!');
    expect(escapeText('hi!', at({ next: '<' }))).toBe('hi!');
    expect(escapeText('a!b', inside)).toBe('a!b');
  });

  it('escapes only the whitespace that paragraph parsing would trim', () => {
    expect(escapeText('  a  ', at({ lineStart: true, lineEnd: true }))).toBe('&#32; a &#32;');
    expect(escapeText('\ta\t', at({ lineStart: true, lineEnd: true }))).toBe('&#9;a&#9;');
    expect(escapeText(' a ', inside)).toBe(' a ');
  });

  it('escapes the whitespace around a hard break', () => {
    expect(escapeText('a \n b', inside)).toBe('a&#32;\\\n&#32;b');
  });

  it('writes a hard break as a backslash unless that would end the paragraph', () => {
    const middle = at({ previous: 'x', following: 'y' });
    expect(escapeText('a\nb', middle)).toBe('a\\\nb');
    expect(escapeText('\nb', at({ previous: '', following: 'y' }))).toBe('<br>b');
    expect(escapeText('a\n', at({ previous: 'x', following: '' }))).toBe('a<br>');
    expect(escapeText('\nb', at({ previous: '\n', following: 'y' }))).toBe('<br>b');
    expect(escapeText('a\n\nb', middle)).toBe('a\\\n<br>b');
    expect(escapeText('a\nb', { ...middle, hardBreak: 'br' })).toBe('a<br>b');
  });

  it('treats text with no neighbours as the whole region', () => {
    expect(escapeText('\n', inside)).toBe('<br>');
  });

  it('escapes block syntax only at the start of a line and only when asked', () => {
    const asked = at({ lineStart: true, escapeLineStart: true });
    expect(escapeText('# a', asked)).toBe('\\# a');
    expect(escapeText('> a', asked)).toBe('\\> a');
    expect(escapeText('= a', asked)).toBe('\\= a');
    expect(escapeText('+ a', asked)).toBe('\\+ a');
    expect(escapeText('- a', asked)).toBe('\\- a');
    expect(escapeText('# a', at({ lineStart: true }))).toBe('# a');
    expect(escapeText('# a', at({ escapeLineStart: true }))).toBe('# a');
    expect(escapeText('a # b', asked)).toBe('a # b');
  });

  it('escapes the delimiter of an ordered list marker', () => {
    const asked = at({ lineStart: true, escapeLineStart: true });
    expect(escapeText('1. a', asked)).toBe('1\\. a');
    expect(escapeText('123) a', asked)).toBe('123\\) a');
    expect(escapeText('1a. b', asked)).toBe('1a. b');
    expect(escapeText('12', asked)).toBe('12');
    expect(escapeText('x\n9. y', at({ ...asked, previous: '', following: '' }))).toBe('x\\\n9\\. y');
  });

  it('starts a new line after a backslash break but not after a <br>', () => {
    const asked = at({ lineStart: true, escapeLineStart: true, previous: '', following: 'z' });
    expect(escapeText('a\n# b', asked)).toBe('a\\\n\\# b');
    expect(escapeText('a\n# b', { ...asked, hardBreak: 'br' })).toBe('a<br># b');
  });

  it('escapes pipes only when asked', () => {
    expect(escapeText('a|b', inside)).toBe('a|b');
    expect(escapeText('a|b', at({ escapePipes: true }))).toBe('a\\|b');
  });
});
