import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { equalInline } from '../../model/inline';
import { arbitraryInline, arbitraryRichInline } from './inline-arbitrary';
import { parseInline } from './parse-inline';
import { renderInline } from './render-inline';
import { serializeInline } from './serialize-inline';

const PRETTY = { escapeLineStart: true, escapePipes: true, hardBreak: 'backslash', strict: false } as const;
const STRICT = { ...PRETTY, strict: true } as const;

const FRAGMENTS = [
  ...'ab *_~`[]()<>!&#;$@|:-+=1.',
  '\\',
  '"',
  '\u00E9',
  '\uD83D\uDC4D',
  '\n',
  '<u>',
  '</u>',
  '<br>',
  '<mark data-color="red">',
  '<span data-bg="blue">',
  '<span data-comment="c1">',
  '<span data-mark="kbd" data-attr-k="v&amp;&quot;|">',
  '<span data-atom="emoji" data-attr-name="x"></span>',
  '</span>',
  '&amp;',
  '&#32;',
  '](mention:1)',
  '](mention:page:1)',
  '[@Ada',
  '](https://a.b "T")',
  "](<a b> 'x')",
  '](a(b))',
  '](javascript:x)',
  '<https://a.b>',
  '<a@b.c>',
  '$x^2$',
  '`a`',
  '``a`b``',
  '**',
  '__',
  '~~',
  '<strong>',
  '</strong>',
  '<sub>',
];
const markdownSource = fc
  .array(fc.constantFrom(...FRAGMENTS), { maxLength: 40 })
  .map((parts) => parts.join(''));

describe('inline round trip', () => {
  it('parse(serialize(x)) equals x for any normalized inline', () => {
    fc.assert(
      fc.property(arbitraryInline(), (inline) => {
        const markdown = serializeInline(inline);
        expect(equalInline(parseInline(markdown), inline), markdown).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  it('round trips with line-start escaping and pipe escaping too', () => {
    fc.assert(
      fc.property(arbitraryInline(), (inline) => {
        const markdown = serializeInline(inline, { escapeLineStart: true, escapePipes: true });
        expect(equalInline(parseInline(serializeInline(inline, { hardBreak: 'br' })), inline)).toBe(true);
        expect(equalInline(parseInline(markdown), inline), markdown).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it('round trips content from extensions with values that need escaping', () => {
    fc.assert(
      fc.property(arbitraryRichInline(), (inline) => {
        for (const options of [{}, { escapeLineStart: true, escapePipes: true, hardBreak: 'br' } as const]) {
          const markdown = serializeInline(inline, options);
          expect(equalInline(parseInline(markdown), inline), markdown).toBe(true);
        }
      }),
      { numRuns: 1500 },
    );
  });
});

describe('the two forms of the serializer', () => {
  it('reads the strict form back on its own, so the fallback always holds', () => {
    fc.assert(
      fc.property(fc.oneof(arbitraryInline(), arbitraryRichInline()), (inline) => {
        const markdown = renderInline(inline, STRICT);
        expect(equalInline(parseInline(markdown), inline), markdown).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  it('reads the pretty form back on its own, so the fallback is never needed for these models', () => {
    fc.assert(
      fc.property(fc.oneof(arbitraryInline(), arbitraryRichInline()), (inline) => {
        const markdown = renderInline(inline, PRETTY);
        expect(equalInline(parseInline(markdown), inline), markdown).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('inline read from markdown', () => {
  it('round trips whatever the parser produces', () => {
    fc.assert(
      fc.property(markdownSource, (source) => {
        const inline = parseInline(source);
        const written = serializeInline(inline);
        expect(equalInline(parseInline(written), inline), `${source} => ${written}`).toBe(true);
      }),
      { numRuns: 2000 },
    );
  });

  it('reaches a fixed point after one pass', () => {
    fc.assert(
      fc.property(markdownSource, (source) => {
        const once = serializeInline(parseInline(source));
        expect(serializeInline(parseInline(once))).toBe(once);
      }),
      { numRuns: 2000 },
    );
  });
});
