import fc from 'fast-check';
import { arbitraryInline } from '../markdown/inline/inline-arbitrary';
import { PALETTE } from '../markdown/palette';
import { normalizeInline, text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import type { BlockAttrs, EngineBlock, Inline, InlineNode } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';
import { cellKey } from './table-spec';

type Draft = Pick<EngineBlock, 'type' | 'attrs' | 'regions'>;

const LANGUAGES = ['', 'ts', 'c++', 'py'];
const CODE_LINES = ['', 'a', '  b', '\tc', '```', '~~~', '$$', '---', '# h', '- x', '<!-- quoin:toc -->', '</details>'];
const LATEX = ['x', 'x^2', 'a\\\\b', 'a\nb', '\\frac{1}{2}', 'x_{i}', ''];
const TONES = ['info', 'tip', 'success', 'warning', 'danger', 'custom'];
const KEYS = ['a', 'b', '-->', 'c--d', ''];
const STRINGS = ['a', '', '-->', '--', '---', '<!--', '\u2028', '\u2029', '\n', 'x"y', '\\', '\u00E9', '\uD83D\uDC4D'];
const FIRST_NUMBERS = [0, 1, 1, 2, 7, 8, 9, 10, 99, 999_999_990];

const scalar = fc.oneof(
  fc.constantFrom(...STRINGS),
  fc.integer({ min: -5, max: 5 }),
  fc.boolean(),
  fc.constant(null),
);
const jsonValue = fc.oneof(
  { weight: 3, arbitrary: scalar },
  { weight: 1, arbitrary: fc.array(scalar, { maxLength: 2 }) },
  { weight: 1, arbitrary: fc.dictionary(fc.constantFrom(...KEYS), scalar, { maxKeys: 2 }) },
);

const withoutBreaks = (node: InlineNode): InlineNode =>
  node.kind === 'text' ? text(node.text.replace(/\n/g, ' '), node.marks) : node;
const oneLine = (inline: Inline): Inline => normalizeInline(inline.map(withoutBreaks));

const line = fc.oneof(
  { weight: 3, arbitrary: fc.constant<BlockAttrs>({ kind: 'paragraph' }) },
  { weight: 2, arbitrary: fc.integer({ min: 1, max: 6 }).map((level): BlockAttrs => ({ kind: 'heading', level })) },
  { weight: 2, arbitrary: fc.constant<BlockAttrs>({ kind: 'bullet' }) },
  { weight: 3, arbitrary: fc.constantFrom(...FIRST_NUMBERS).map((start): BlockAttrs => ({ kind: 'ordered', start })) },
  { weight: 2, arbitrary: fc.boolean().map((checked): BlockAttrs => ({ kind: 'task', checked })) },
  { weight: 2, arbitrary: fc.constant<BlockAttrs>({ kind: 'quote' }) },
);

const extraKeys = fc.dictionary(fc.constantFrom(...KEYS), jsonValue, { minKeys: 1, maxKeys: 2 });
const sometimes = <T>(arbitrary: fc.Arbitrary<T>, none: T) =>
  fc.oneof({ weight: 3, arbitrary: fc.constant(none) }, { weight: 1, arbitrary });
const textStyle = fc.record(
  {
    align: fc.constantFrom('left', 'center', 'right', 'justify'),
    color: fc.constantFrom(...PALETTE),
    background: fc.constantFrom(...PALETTE),
    extra: extraKeys,
  },
  { requiredKeys: [] },
);
const blockExtra = extraKeys.map((extra) => ({ extra }));
const noStyle: Record<string, unknown> = {};

const markdownDraft = (extras: boolean) =>
  fc
    .tuple(line, arbitraryInline(), extras ? sometimes(textStyle, noStyle) : fc.constant(noStyle))
    .map(([attrs, inline, style]): Draft => ({
      type: 'MARKDOWN',
      attrs: { ...attrs, ...style },
      regions: { text: inline },
    }));

const calloutDraft = fc
  .tuple(fc.constantFrom(...TONES), arbitraryInline(), fc.option(fc.constantFrom('\u{1F4A1}', 'i'), { nil: undefined }))
  .map(([tone, body, icon]): Draft => ({ type: 'CALLOUT', attrs: { tone, icon }, regions: { body } }));

const codeDraft = fc
  .tuple(fc.constantFrom(...LANGUAGES), fc.array(fc.constantFrom(...CODE_LINES), { maxLength: 4 }))
  .map(([language, lines]): Draft => ({
    type: 'CODE',
    attrs: { language, code: lines.join('\n').replace(/\n+$/, '') },
    regions: {},
  }));

const CLOSING_TAGS = [
  text('</summary>'),
  text('</summary>', [{ type: 'code' }]),
  text('a </summary> \\ b'),
  text('\n</summary>'),
];
const summary = fc.oneof(
  { weight: 3, arbitrary: arbitraryInline() },
  {
    weight: 2,
    arbitrary: fc
      .tuple(arbitraryInline(), fc.constantFrom(...CLOSING_TAGS), arbitraryInline())
      .map(([before, tag, after]) => normalizeInline([...before, tag, ...after])),
  },
);

const toggleDraft = (extras: boolean) =>
  fc
    .tuple(fc.boolean(), summary, extras ? sometimes(blockExtra, noStyle) : fc.constant(noStyle))
    .map(([open, text, style]): Draft => ({ type: 'TOGGLE', attrs: { open, ...style }, regions: { text } }));

const tableDraft = fc
  .tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 3 }), fc.boolean())
  .chain(([rows, cols, header]) =>
    fc
      .tuple(
        fc.array(arbitraryInline().map(oneLine), { minLength: rows * cols, maxLength: rows * cols }),
        fc.array(fc.constantFrom('left', 'center', 'right', null), { minLength: cols, maxLength: cols }),
      )
      .map(([cells, align]): Draft => {
        const regions: Record<string, Inline> = {};
        cells.forEach((cell, at) => (regions[cellKey(Math.floor(at / cols), at % cols)] = cell));
        return { type: 'TABLE', attrs: { header, align, rows, cols }, regions };
      }),
  );

const mathDraft = fc.constantFrom(...LATEX).map((latex): Draft => ({ type: 'MATH', attrs: { latex }, regions: {} }));
const markerDraft = (extras: boolean) =>
  fc
    .tuple(fc.constantFrom('DIVIDER', 'TOC'), extras ? sometimes(blockExtra, noStyle) : fc.constant(noStyle))
    .map(([type, style]): Draft => ({ type, attrs: style, regions: {} }));
const pluginDraft = fc
  .dictionary(fc.constantFrom(...KEYS), jsonValue, { maxKeys: 3 })
  .map((data): Draft => ({ type: 'PLUGIN', attrs: { data }, regions: {} }));

const draftArbitrary = (extras: boolean) =>
  fc.oneof(
    { weight: 12, arbitrary: markdownDraft(extras) },
    { weight: 2, arbitrary: calloutDraft },
    { weight: 2, arbitrary: codeDraft },
    { weight: 2, arbitrary: markerDraft(extras) },
    { weight: 3, arbitrary: toggleDraft(extras) },
    { weight: 2, arbitrary: tableDraft },
    { weight: 1, arbitrary: mathDraft },
    { weight: 2, arbitrary: pluginDraft },
  );

const opensContainer = ({ type, attrs }: Draft) =>
  type === 'TOGGLE' || (type === 'MARKDOWN' && ['bullet', 'ordered', 'task'].includes(String(attrs.kind)));

// Markdown can only nest a block inside an open list item or toggle, so a block is never deeper than the number of
// open containers, and an ordered run counts up from its first item the way the writer numbers it.
function arrange(entries: readonly (readonly [Draft, number])[]): EngineBlock[] {
  const open: number[] = [];
  const runs = new Map<number, number>();
  return entries.map(([draft, pick], at) => {
    const indent = Math.min(pick, open.length);
    open.length = indent;
    for (const level of [...runs.keys()]) if (level > indent) runs.delete(level);
    let { attrs } = draft;
    if (draft.type === 'MARKDOWN' && attrs.kind === 'ordered') {
      const start = runs.get(indent) ?? (attrs.start as number);
      runs.set(indent, start + 1);
      attrs = { ...attrs, start };
    } else {
      runs.delete(indent);
    }
    if (opensContainer(draft)) open.push(indent);
    return { id: `b${at}`, ...draft, attrs, indent };
  });
}

// With extras, text blocks, toggles, dividers and tables of contents sometimes carry data that markdown cannot hold in
// its native form, which only a lossless export keeps.
export function arbitraryBlocks({ extras = false }: { extras?: boolean } = {}): fc.Arbitrary<QuoinBlock[]> {
  const codec = createBlockCodec(createSchema());
  return fc
    .array(fc.tuple(draftArbitrary(extras), fc.integer({ min: 0, max: 3 })), { maxLength: 8 })
    .map((entries) => arrange(entries).map((block) => codec.toQuoin(block)));
}
