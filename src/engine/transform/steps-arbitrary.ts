import fc from 'fast-check';
import { arbitraryInline } from '../markdown/inline/inline-arbitrary';
import { createDoc } from '../model/doc';
import { inlineLength, text } from '../model/inline';
import type { BlockAttrs, EngineBlock, EngineDoc, Inline, Mark } from '../model/types';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import type { Step } from './step';

type Content = Pick<EngineBlock, 'type' | 'attrs' | 'regions'>;
type Span = { block: EngineBlock; from: number; to: number };

const ATTRS: readonly BlockAttrs[] = [{ kind: 'paragraph' }, { kind: 'heading', level: 2 }, { kind: 'bullet' }];
const PATCHES: readonly BlockAttrs[] = [
  { kind: 'heading', level: 2 },
  { level: undefined },
  { kind: undefined },
  { kind: 'task', checked: true },
];
const MARKS: readonly Mark[] = [
  { type: 'bold' },
  { type: 'italic' },
  { type: 'code' },
  { type: 'link', attrs: { href: 'https://a.b' } },
  { type: 'highlight', attrs: { color: 'red' } },
  { type: 'comment', attrs: { id: 'c1' } },
];
const MARK_TYPES = ['bold', 'italic', 'code', 'link', 'comment'];

const indent = fc.integer({ min: 0, max: 2 });
const textContent: fc.Arbitrary<Content> = fc
  .tuple(fc.constantFrom(...ATTRS), arbitraryInline())
  .map(([attrs, inline]) => ({ type: 'MARKDOWN', attrs, regions: { text: inline } }));
const dividerContent: Content = { type: 'DIVIDER', attrs: {}, regions: {} };
const bodyContent: fc.Arbitrary<Content> = arbitraryInline().map((inline) => ({
  type: 'CALLOUT',
  attrs: { tone: 'info' },
  regions: { body: inline },
}));
const anyContent = fc.oneof(
  { weight: 4, arbitrary: textContent },
  { weight: 1, arbitrary: fc.constant(dividerContent) },
  { weight: 1, arbitrary: bodyContent },
);

const arbitraryDoc: fc.Arbitrary<EngineDoc> = fc
  .tuple(
    fc.array(fc.tuple(textContent, indent), { minLength: 1, maxLength: 4 }),
    fc.option(fc.nat(3), { nil: undefined }),
  )
  .map(([entries, dividerAt]) =>
    createDoc(
      entries.map(([content, level], at) => ({
        id: `b${at}`,
        indent: level,
        ...(at === dividerAt ? dividerContent : content),
      })),
    ),
  );

const hasText = (block: EngineBlock) => Object.hasOwn(block.regions, 'text');

const range = (length: number) =>
  fc.tuple(fc.nat(length), fc.nat(length)).map(([a, b]) => ({ from: Math.min(a, b), to: Math.max(a, b) }));

const spanIn = (blocks: readonly EngineBlock[]): fc.Arbitrary<Span> =>
  fc
    .constantFrom(...blocks)
    .chain((block) => range(inlineLength(block.regions.text)).map((offsets) => ({ block, ...offsets })));

function blockSteps({ blocks }: EngineDoc): fc.Arbitrary<Step>[] {
  const count = blocks.length;
  const any = fc.constantFrom(...blocks);
  return [
    fc.tuple(any, fc.constantFrom(...PATCHES)).map(([block, patch]) => setAttrsStep(block.id, patch)),
    fc.tuple(any, fc.integer({ min: 0, max: 3 })).map(([block, level]) => setIndentStep(block.id, level)),
    fc.tuple(any, anyContent).map(([block, content]) => replaceBlockStep({ ...block, ...content })),
    fc
      .tuple(fc.nat(count), fc.array(anyContent, { minLength: 1, maxLength: 2 }))
      .map(([at, contents]) =>
        insertBlocksStep(
          at,
          contents.map((content, i) => ({ id: `n${i}`, indent: 0, ...content })),
        ),
      ),
    fc.nat(count).chain((at) => fc.nat(count - at).map((n) => removeBlocksStep(at, n))),
    fc
      .nat(count)
      .chain((n) => fc.tuple(fc.constant(n), fc.nat(count - n), fc.nat(count - n)))
      .map(([n, from, to]) => moveBlocksStep(from, n, to)),
  ];
}

function textSteps(texts: readonly EngineBlock[]): fc.Arbitrary<Step>[] {
  const span = spanIn(texts);
  const createdBlock = fc.tuple(
    indent,
    fc.constantFrom('text', 'body'),
    fc.constantFrom<Record<string, Inline>>({}, { note: [text('n')] }),
  );
  return [
    fc
      .tuple(span, arbitraryInline())
      .map(([{ block, from, to }, slice]) => replaceInlineStep(block.id, 'text', from, to, slice)),
    fc
      .tuple(span, fc.constantFrom(...MARKS))
      .map(([{ block, from, to }, mark]) => addMarkStep(block.id, 'text', from, to, mark)),
    fc
      .tuple(span, fc.oneof(fc.constantFrom(...MARKS), fc.constantFrom(...MARK_TYPES)))
      .map(([{ block, from, to }, mark]) => removeMarkStep(block.id, 'text', from, to, mark)),
    fc.tuple(span, createdBlock).map(([{ block, from }, [level, region, regions]]) => {
      const created = { id: 'c0', type: 'MARKDOWN', attrs: { kind: 'paragraph' }, indent: level, region, regions };
      return splitBlockStep(block.id, 'text', from, created);
    }),
  ];
}

function joinSteps({ blocks }: EngineDoc): fc.Arbitrary<Step>[] {
  const targets = blocks.slice(0, -1).filter((block, at) => hasText(block) && hasText(blocks[at + 1]));
  return targets.length === 0
    ? []
    : [
        fc
          .constantFrom(...targets)
          .map((block) => joinBlocksStep(block.id, 'text', blocks[blocks.indexOf(block) + 1].id, 'text')),
      ];
}

export function arbitraryDocWithStep(): fc.Arbitrary<{ doc: EngineDoc; step: Step }> {
  return arbitraryDoc.chain((doc) => {
    const texts = doc.blocks.filter(hasText);
    const steps = [...blockSteps(doc), ...(texts.length > 0 ? textSteps(texts) : []), ...joinSteps(doc)];
    return fc.oneof(...steps).map((step) => ({ doc, step }));
  });
}
