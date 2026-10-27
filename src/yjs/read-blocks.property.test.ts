import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { sameDoc } from '../engine/model/same-doc';
import type { Step } from '../engine/transform/step';
import { text as textNode } from '../engine/model/inline';
import type { EngineBlock } from '../engine/model/types';
import { regionStart, writeBlocks } from './doc-shape';
import { readShared } from './read-shared';
import type { RequiredRegions } from './required-regions';
import { layoutShape } from './test-support/layout-shape';
import { arbitraryToken, writeTokens } from './test-support/tokens';
import { readRemote } from './yjs-to-steps';

const REGIONS: RequiredRegions = (type) => (type === 'MARKDOWN' ? ['text'] : type === 'TWO' ? ['text', 'body'] : []);

const block = fc.record({
  type: fc.constantFrom('MARKDOWN', 'TWO', 'DIVIDER'),
  words: fc.array(fc.stringMatching(/^[a-z]{1,3}$/), { maxLength: 2 }),
});

// A text as clients write it, or as any writer could have left it.
const start = fc.oneof(
  fc.array(arbitraryToken, { maxLength: 24 }).map((tokens) => (text: Y.Text) => writeTokens(text, tokens)),
  fc.array(block, { maxLength: 6 }).map((blocks) => (text: Y.Text) => {
    const written = blocks.map(({ type, words }, i): EngineBlock => {
      const regions = REGIONS(type).map((name, j) => [name, words[j] === undefined ? [] : [textNode(words[j])]]);
      return { id: `b${i}`, type, indent: 0, attrs: {}, regions: Object.fromEntries(regions) };
    });
    writeBlocks(text, 0, written);
  }),
);

const edit = fc.record({
  kind: fc.constantFrom('insert', 'delete', 'region', 'bold'),
  at: fc.nat(80),
  length: fc.integer({ min: 1, max: 3 }),
  name: fc.constantFrom('text', 'body'),
});

const retype = fc.record({ marker: fc.nat(12), type: fc.constantFrom<unknown>('MARKDOWN', 'TWO', 'DIVIDER', 4) });

type Edit = typeof edit extends fc.Arbitrary<infer T> ? T : never;

function change(text: Y.Text, { kind, at, length, name }: Edit): void {
  const place = Math.min(at, text.length);
  if (kind === 'insert') text.insert(place, 'xyz'.slice(0, length), {});
  else if (kind === 'region') text.insertEmbed(place, regionStart(name), {});
  else if (kind === 'bold') text.format(place, Math.min(length, text.length - place), { bold: true });
  else text.delete(place, Math.min(length, text.length - place));
}

const markers = (text: Y.Text) =>
  (text.toDelta() as { insert: unknown }[]).flatMap(({ insert }) => (insert instanceof Y.Map ? [insert] : []));

describe('reading a remote change of the types of blocks', () => {
  it('gives the document and the layout a fresh reading of the text gives, whatever the text held', () => {
    let narrow = 0;
    fc.assert(
      fc.property(
        start,
        fc.array(edit, { maxLength: 3 }),
        fc.array(retype, { minLength: 1, maxLength: 2 }),
        (write, edits, retypes) => {
          const text = new Y.Doc().getText('quoin');
          write(text);
          const before = readShared(text, REGIONS);
          const shared = { text, layout: before.layout, stale: false, required: REGIONS };
          let read: { steps: Step[]; failed?: Error } = { steps: [] };
          text.observeDeep((events) => void (read = readRemote(shared, events, before.doc)));
          text.doc!.transact(() => {
            for (const one of edits) change(text, one);
            const maps = markers(text);
            for (const { marker, type } of retypes) maps[marker % Math.max(maps.length, 1)]?.set('type', type);
          });
          const fresh = readShared(text, REGIONS);
          const doc = read.steps.reduce((changed, step) => step.apply(changed).doc, before.doc);
          expect(read.failed).toBeUndefined();
          expect(sameDoc(doc, fresh.doc)).toBe(true);
          expect(layoutShape(shared.layout)).toEqual(layoutShape(fresh.layout));
          if (read.steps.some((step) => step.stepType === 'replaceBlock')) narrow++;
        },
      ),
      { seed: 20261027, numRuns: 1000 },
    );
    expect(narrow).toBeGreaterThan(150);
  }, 60_000);
});
