import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { equalInline, normalizeInline, text } from '../../model/inline';
import type { Mark } from '../../model/types';
import { parseInline } from './parse-inline';
import { renderInline } from './render-inline';
import { serializeInline } from './serialize-inline';

const bold: Mark = { type: 'bold' };
const italic: Mark = { type: 'italic' };
const strike: Mark = { type: 'strike' };
const link: Mark = { type: 'link', attrs: { href: 'https://a.b' } };

describe('text that only looks like syntax', () => {
  it.each([
    'snake_case_name',
    'https://example.com/a_b_c?x=1',
    'C:\\Users\\me',
    'C:\\Program Files\\a_b',
    '1_000 and a_b\\c',
  ])('is written as it is and read back as the same text: %s', (value) => {
    expect(serializeInline([text(value)])).toBe(value);
    expect(parseInline(value)).toEqual([text(value)]);
  });

  it('keeps the escapes that are needed around the same characters', () => {
    expect(serializeInline([text('_a_ b\\')])).toBe('\\_a\\_ b\\\\');
    expect(serializeInline([text('a\\*b\\')])).toBe('a\\\\\\*b\\\\');
  });

  it('reads back inside every kind of mark', () => {
    const piece = fc.constantFrom('a', 'b', '1', '_', '\\', ' ', '*', '\n', '\u00e9');
    const run = fc.array(piece, { minLength: 1, maxLength: 8 }).map((parts) => parts.join(''));
    const marks = fc.constantFrom<Mark[]>([], [bold], [italic], [strike], [link], [bold, italic], [link, bold]);
    const inline = fc
      .array(fc.tuple(run, marks), { minLength: 1, maxLength: 5 })
      .map((entries) => normalizeInline(entries.map(([value, own]) => text(value, own))));
    fc.assert(
      fc.property(inline, (nodes) => {
        const markdown = renderInline(nodes, { escapeLineStart: true, escapePipes: true, hardBreak: 'backslash', strict: false });
        expect(equalInline(parseInline(markdown), nodes), markdown).toBe(true);
      }),
      { numRuns: 5000 },
    );
  });
});
