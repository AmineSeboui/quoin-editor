import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeInline, text } from '../../model/inline';
import { sanitizeHref } from '../urls';
import { parseInline } from './parse-inline';

const CHARACTERS = [...'ab *_~`[]()<>!&#;$@', '\\'];
const UNICODE = ['\u00E9', '\uD83D\uDC4D', '\u00A0'];
const FRAGMENTS = [
  '\n',
  '<u>',
  '</u>',
  '<br>',
  '<span data-color="red">',
  '<span data-mark="link" data-attr-href="javascript:x">',
  '</span>',
  '&amp;',
  '&#0;',
  '](javascript:x)',
  '](mention:1)',
  '<javascript:x>',
  '<https://a.b>',
  '1',
];

const markdown = fc
  .array(fc.constantFrom(...CHARACTERS, ...UNICODE, ...FRAGMENTS), { maxLength: 40 })
  .map((parts) => parts.join(''));
const oneLine = fc
  .array(fc.constantFrom(...CHARACTERS, ...UNICODE), { minLength: 1, maxLength: 30 })
  .map((parts) => parts.join(''));

describe('parseInline properties', () => {
  it('returns normalized inline content for any input', () => {
    fc.assert(
      fc.property(markdown, (source) => {
        const inline = parseInline(source);
        expect(normalizeInline(inline)).toEqual(inline);
      }),
      { numRuns: 2000 },
    );
  });

  it('never produces a link with an unsafe href', () => {
    fc.assert(
      fc.property(markdown, (source) => {
        for (const node of parseInline(source)) {
          for (const mark of node.marks.filter((m) => m.type === 'link')) {
            expect(sanitizeHref(mark.attrs?.href ?? '')).toBe(mark.attrs?.href);
          }
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('reads back any line whose ASCII punctuation is backslash escaped', () => {
    fc.assert(
      fc.property(oneLine, (value) => {
        const escaped = value.replace(/[!-/:-@[-`{-~]/g, '\\$&');
        expect(parseInline(escaped)).toEqual([text(value)]);
      }),
      { numRuns: 1000 },
    );
  });
});
