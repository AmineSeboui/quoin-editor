import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDoc } from '../../engine/model/doc';
import type { EngineBlock, EngineDoc } from '../../engine';
import { buildState } from '../../engine/test-support/build-state';
import { hidingToggleAt, visibleBlockIndexes } from './visible-blocks';

type Shape = { toggle: boolean; open: boolean; indent: number };

const docOf = (shapes: readonly Shape[]): EngineDoc =>
  createDoc(
    shapes.map(
      ({ toggle, open, indent }, i): EngineBlock => ({
        id: `b${i}`,
        type: toggle ? 'TOGGLE' : 'MARKDOWN',
        indent,
        attrs: toggle ? { open } : {},
        regions: {},
      }),
    ),
  );

// A block is hidden by the closed toggles before it whose deeper blocks run unbroken up to it, and the outermost of
// them is the one that hides it.
function hiderBy(shapes: readonly Shape[], at: number): number | null {
  for (let toggle = 0; toggle < at; toggle++) {
    const { toggle: isToggle, open, indent } = shapes[toggle];
    if (!isToggle || open) continue;
    if (shapes.slice(toggle + 1, at + 1).every((shape) => shape.indent > indent)) return toggle;
  }
  return null;
}

const shape = fc.record({ toggle: fc.boolean(), open: fc.boolean(), indent: fc.integer({ min: 0, max: 4 }) });

describe('visibleBlockIndexes', () => {
  it('skips the children of a closed toggle', () => {
    const { doc } = buildState([
      { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } },
      { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
      { id: 'g', type: 'MARKDOWN', data: { markdown: 'grandchild' }, indent: 2 },
      'after',
      { id: 'o', type: 'TOGGLE', data: { markdown: 'O', open: true } },
      { id: 'd', type: 'MARKDOWN', data: { markdown: 'shown' }, indent: 1 },
    ]);
    expect(visibleBlockIndexes(doc)).toEqual([0, 3, 4, 5]);
  });

  it('agrees with a brute force reading of what a closed toggle hides, on random documents', () => {
    fc.assert(
      fc.property(fc.array(shape, { maxLength: 12 }), (shapes) => {
        const doc = docOf(shapes);
        const hiders = shapes.map((_, at) => hiderBy(shapes, at));
        expect(visibleBlockIndexes(doc)).toEqual(hiders.flatMap((hider, at) => (hider === null ? [at] : [])));
      }),
      { numRuns: 2000 },
    );
  });
});

describe('hidingToggleAt', () => {
  it('names the outermost closed toggle over a block, whatever is open inside it', () => {
    const doc = docOf([
      { toggle: true, open: false, indent: 0 },
      { toggle: true, open: false, indent: 1 },
      { toggle: false, open: false, indent: 2 },
      { toggle: false, open: false, indent: 0 },
    ]);
    expect([0, 1, 2, 3].map((at) => hidingToggleAt(doc, at))).toEqual([null, 0, 0, null]);
  });

  it('agrees with a brute force reading of which toggle hides each block, on random documents', () => {
    fc.assert(
      fc.property(fc.array(shape, { maxLength: 12 }), (shapes) => {
        const doc = docOf(shapes);
        expect(shapes.map((_, at) => hidingToggleAt(doc, at))).toEqual(shapes.map((_, at) => hiderBy(shapes, at)));
      }),
      { numRuns: 2000 },
    );
  });

  it('answers null for an index the document does not have', () => {
    expect(hidingToggleAt(docOf([{ toggle: true, open: false, indent: 0 }]), 5)).toBeNull();
  });

  it('walks a document once, however many blocks ask', () => {
    let reads = 0;
    const counted = (block: EngineBlock): EngineBlock => ({
      ...block,
      get indent() {
        reads += 1;
        return block.indent;
      },
    });
    const shapes: Shape[] = [
      { toggle: true, open: false, indent: 0 },
      ...Array.from({ length: 200 }, () => ({ toggle: false, open: false, indent: 1 })),
    ];
    const doc = createDoc(docOf(shapes).blocks.map(counted));
    expect(hidingToggleAt(doc, 1)).toBe(0);
    const once = reads;
    expect(once).toBeGreaterThan(0);
    for (let at = 0; at < shapes.length; at++) hidingToggleAt(doc, at);
    visibleBlockIndexes(doc);
    expect(reads).toBe(once);
  });

  it('does not look at a document without a closed toggle', () => {
    let reads = 0;
    const doc = createDoc(
      Array.from({ length: 50 }, (_, i) => ({
        id: `b${i}`,
        type: 'MARKDOWN',
        attrs: {},
        regions: {},
        get indent() {
          reads += 1;
          return i === 0 ? 0 : 1;
        },
      })),
    );
    expect(visibleBlockIndexes(doc)).toHaveLength(50);
    expect(reads).toBe(0);
  });
});
