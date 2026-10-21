import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type * as Y from 'yjs';
import { blockById, createDoc } from '../engine/model/doc';
import { inlineText } from '../engine/model/inline';
import { sameDoc } from '../engine/model/same-doc';
import type { EngineDoc } from '../engine/model/types';
import { arbitraryDocWithStep } from '../engine/transform/steps-arbitrary';
import type { Step } from '../engine/transform/step';
import { fromYBlock, toYBlock, type YBlock } from './doc-shape';
import { writeLocalSteps } from './local-to-yjs';
import { linkedDocs } from './test-support/peers';
import { stepsFromYjs } from './yjs-to-steps';

const LOCAL = { local: true };

const readBack = (blocks: Y.Array<YBlock>) => createDoc(blocks.toArray().map(fromYBlock));

function applied(doc: EngineDoc, step: Step): EngineDoc | null {
  try {
    return step.apply(doc).doc;
  } catch {
    return null;
  }
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;

// Yjs stores text as UTF-8, so it cannot cut between the halves of a surrogate pair. The editor's commands move by
// grapheme and never do; the arbitrary steps can.
function cutsAPair(doc: EngineDoc, step: Step): boolean {
  const { block, region, from, to, offset } = step.toJSON() as Record<string, unknown>;
  const inline = blockById(doc, block as string)?.regions[region as string];
  if (inline === undefined) return false;
  const value = inlineText(inline);
  return [from, to, offset].some((at) => typeof at === 'number' && isHighSurrogate(value.charCodeAt(at - 1)));
}

describe('a step written to a shared document and read back on another client', () => {
  it('gives both clients the document the step gives the engine, read back as steps', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const after = applied(doc, step);
        fc.pre(after !== null && !cutsAPair(doc, step));
        const { docs, flush } = linkedDocs();
        const [mine, theirs] = docs.map((ydoc) => ydoc.getArray<YBlock>('quoin'));
        mine.insert(0, doc.blocks.map(toYBlock));
        flush();
        let seen = doc;
        const kinds: string[] = [];
        theirs.observeDeep((events) => {
          for (const remote of stepsFromYjs(events, theirs, seen).steps) {
            kinds.push(remote.stepType);
            seen = remote.apply(seen).doc;
          }
        });
        docs[0].transact(() => writeLocalSteps(mine, [step], [doc, after!]), LOCAL);
        flush();
        expect(sameDoc(readBack(mine), after!)).toBe(true);
        expect(sameDoc(readBack(theirs), after!)).toBe(true);
        expect(sameDoc(seen, after!)).toBe(true);
        expect(kinds).not.toContain('replaceDoc');
      }),
      { seed: 20261021, numRuns: 1000 },
    );
  });
});
