import fc from 'fast-check';
import { atom, normalizeInline, text } from '../../model/inline';
import { addMark } from '../../model/marks';
import type { Inline, InlineNode, Mark } from '../../model/types';
import { PALETTE } from '../palette';

const HAZARDS = [...'*_~`[]()<>&#$|!-+.=;', '\\'];
const FILLER = ['a', 'b', ' ', '1', '\n', '\t'];
const UNICODE = ['\u00E9', '\uD83D\uDC4D'];
const WORDS = ['https://a.b', 'a@b.c', 'mailto:a@b.c'];
const HREFS = ['https://a.b', 'https://a.b/(x)', 'mailto:a@b.c', '#top', 'a b'];

const piece = fc.oneof(
  { weight: 6, arbitrary: fc.constantFrom(...HAZARDS) },
  { weight: 6, arbitrary: fc.constantFrom(...FILLER) },
  { weight: 1, arbitrary: fc.constantFrom(...UNICODE) },
  { weight: 1, arbitrary: fc.constantFrom(...WORDS) },
);
const textValue = fc.array(piece, { minLength: 1, maxLength: 6 }).map((parts) => parts.join(''));
const color = fc.constantFrom(...PALETTE);

const markArbitrary: fc.Arbitrary<Mark> = fc.oneof(
  fc.constantFrom<Mark>(
    { type: 'bold' },
    { type: 'italic' },
    { type: 'strike' },
    { type: 'underline' },
    { type: 'code' },
    { type: 'sub' },
    { type: 'sup' },
  ),
  color.map((value): Mark => ({ type: 'highlight', attrs: { color: value } })),
  color.map((value): Mark => ({ type: 'color', attrs: { color: value } })),
  color.map((value): Mark => ({ type: 'background', attrs: { color: value } })),
  fc.constantFrom('c1', 'c2').map((id): Mark => ({ type: 'comment', attrs: { id } })),
  fc.constantFrom(...HREFS).map((href): Mark => ({ type: 'link', attrs: { href } })),
);
const marks = fc.array(markArbitrary, { maxLength: 4 }).map((list) => list.reduce<Mark[]>(addMark, []));

const atomArbitrary = fc.oneof(
  fc
    .tuple(fc.constantFrom('1', '2'), fc.constantFrom('Ada', 'Bo B'), marks)
    .map(([id, label, own]) => atom('mention', { id, label }, own)),
  fc.tuple(fc.constantFrom('x^2', 'a_b', '5', '2x'), marks).map(([latex, own]) => atom('math', { latex }, own)),
);
const nodeArbitrary: fc.Arbitrary<InlineNode> = fc.oneof(
  { weight: 4, arbitrary: fc.tuple(textValue, marks).map(([value, own]) => text(value, own)) },
  { weight: 1, arbitrary: atomArbitrary },
);

export function arbitraryInline(): fc.Arbitrary<Inline> {
  return fc.array(nodeArbitrary, { maxLength: 6 }).map(normalizeInline);
}

const AWKWARD_VALUES = [
  'x',
  'a"b',
  '&amp;',
  '<b>',
  'a|b',
  'a\nb',
  'a\n# b',
  'a\n1. b',
  'a\n- b',
  '',
  ' ',
  '\\',
  'a b',
  '&',
  '\u00E9',
];
const AWKWARD_HREFS = [
  '',
  'a\\b',
  'a&amp;b',
  'a)b',
  'a(b',
  '<x>',
  'a<b',
  'a>b',
  'https://a.b/?q=1&r=2',
  'a"b',
  "a'b",
  'a|b',
];
const AWKWARD_LATEX = ['x', 'a$b', ' x', 'x ', 'x\\', '', 'a\nb', '5', 'a|b', '\\$'];

const richMarkArbitrary: fc.Arbitrary<Mark> = fc.oneof(
  markArbitrary,
  fc.constantFrom<Mark>({ type: 'kbd' }, { type: 'constructor' }),
  fc.constantFrom(...AWKWARD_VALUES).map((value): Mark => ({ type: 'tag', attrs: { label: value, k: 'v' } })),
  fc
    .tuple(fc.constantFrom(...AWKWARD_HREFS, 'mention:1'), fc.constantFrom(...AWKWARD_VALUES))
    .map(([href, title]): Mark => ({ type: 'link', attrs: title ? { href, title } : { href } })),
);
const richMarks = fc.array(richMarkArbitrary, { maxLength: 4 }).map((list) => list.reduce<Mark[]>(addMark, []));

const richAtomArbitrary = fc.oneof(
  fc
    .tuple(fc.constantFrom('1', 'a b', '1 ', 'x:y', ''), fc.constantFrom(...AWKWARD_VALUES), richMarks)
    .map(([id, label, own]) => atom('mention', { id, label }, own)),
  fc
    .tuple(fc.constantFrom('page', 'a:b', ''), richMarks)
    .map(([kind, own]) => atom('mention', { id: '7', label: 'Ada', kind }, own)),
  fc.tuple(fc.constantFrom(...AWKWARD_LATEX), richMarks).map(([latex, own]) => atom('math', { latex }, own)),
  fc.tuple(fc.constantFrom(...AWKWARD_VALUES), richMarks).map(([name, own]) => atom('emoji', { name }, own)),
  richMarks.map((own) => atom('divider', {}, own)),
);

// Content from extensions, with values that need escaping in every position they can appear.
export function arbitraryRichInline(): fc.Arbitrary<Inline> {
  const richNode = fc.oneof(
    { weight: 4, arbitrary: fc.tuple(textValue, richMarks).map(([value, own]) => text(value, own)) },
    { weight: 2, arbitrary: richAtomArbitrary },
  );
  return fc.array(richNode, { maxLength: 6 }).map(normalizeInline);
}
