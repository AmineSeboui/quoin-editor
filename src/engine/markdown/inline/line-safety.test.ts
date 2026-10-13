import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { text } from '../../model/inline';
import { arbitraryInline, arbitraryRichInline } from './inline-arbitrary';
import { serializeInline } from './serialize-inline';

const BLOCK_START = /^(?:#|>|=|\+|-|[0-9]+[.)]|[*+-][ \t]|`{3,}[^`]*$|~{3,})/;
const ARBITRARY = fc.oneof(arbitraryInline(), arbitraryRichInline());

describe('lines of serialized inline content', () => {
  it('never start like block syntax when line start escaping is on', () => {
    fc.assert(
      fc.property(ARBITRARY, (inline) => {
        const markdown = serializeInline(inline, { escapeLineStart: true });
        for (const line of markdown.split('\n')) expect(line, markdown).not.toMatch(BLOCK_START);
      }),
      { numRuns: 3000 },
    );
  });

  it('never start or end with whitespace, which paragraph parsing would trim', () => {
    fc.assert(
      fc.property(ARBITRARY, (inline) => {
        const markdown = serializeInline(inline, { escapeLineStart: true });
        for (const line of markdown.split('\n')) expect(line, markdown).not.toMatch(/^[ \t]|[ \t]$/);
      }),
      { numRuns: 3000 },
    );
  });

  it('are never blank, which would end the paragraph', () => {
    fc.assert(
      fc.property(ARBITRARY, (inline) => {
        const markdown = serializeInline(inline, { escapeLineStart: true });
        if (markdown !== '') for (const line of markdown.split('\n')) expect(line.trim(), markdown).not.toBe('');
      }),
      { numRuns: 3000 },
    );
  });

  it('never hold a raw newline when hard breaks are written as <br>', () => {
    fc.assert(
      fc.property(ARBITRARY, (inline) => {
        expect(serializeInline(inline, { hardBreak: 'br', escapePipes: true })).not.toContain('\n');
      }),
      { numRuns: 1000 },
    );
  });

  it('keep every pipe escaped for table cells', () => {
    const cell = serializeInline([text('a|b'), text('c|d', [{ type: 'bold' }])], { escapePipes: true });
    expect(cell).toBe('a\\|b**c\\|d**');
  });
});
