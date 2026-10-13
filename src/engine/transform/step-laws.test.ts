import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { EngineDoc } from '../model/types';
import { arbitraryDocWithStep } from './steps-arbitrary';
import { stepFromJSON } from './step-json';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const regionOrder = (doc: EngineDoc) => doc.blocks.map((block) => Object.keys(block.regions));

describe('step laws', () => {
  it('invert(before) undoes every step exactly', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const { doc: after } = step.apply(doc);
        expect(step.invert(doc).apply(after).doc).toEqual(doc);
      }),
      { numRuns: 1000 },
    );
  });

  it('invert(before) restores the order of the regions of every block', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const restored = step.invert(doc).apply(step.apply(doc).doc).doc;
        expect(regionOrder(restored)).toEqual(regionOrder(doc));
      }),
      { numRuns: 1000 },
    );
  });

  it('JSON round trips preserve behaviour', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const copy = stepFromJSON(JSON.parse(JSON.stringify(step.toJSON())));
        expect(copy.apply(doc).doc).toEqual(step.apply(doc).doc);
      }),
      { numRuns: 500 },
    );
  });

  it('maps positions in one region monotonically', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), fc.nat(), fc.nat(), ({ doc, step }, x, y) => {
        const block = doc.blocks[0];
        const region = Object.keys(block.regions)[0];
        if (region === undefined) return;
        const len = block.regions[region].reduce((n, node) => n + (node.kind === 'text' ? node.text.length : 1), 0);
        const [a, b] = [x % (len + 1), y % (len + 1)].sort((p, q) => p - q);
        const { map } = step.apply(doc);
        const ma = map({ block: block.id, region, offset: a });
        const mb = map({ block: block.id, region, offset: b });
        if (ma.block === mb.block && ma.region === mb.region) expect(ma.offset).toBeLessThanOrEqual(mb.offset);
      }),
      { numRuns: 1000 },
    );
  });

  it('never mutates the documents it reads', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const index = [...doc.index];
        deepFreeze(doc.blocks);
        const { doc: after } = step.apply(doc);
        deepFreeze(after.blocks);
        step.invert(doc).apply(after);
        expect([...doc.index]).toEqual(index);
      }),
      { numRuns: 500 },
    );
  });
});
