import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { blockById } from '../engine/model/doc';
import { inlineText } from '../engine/model/inline';
import { sameDoc } from '../engine/model/same-doc';
import type { EngineDoc } from '../engine/model/types';
import { arbitraryDocWithStep } from '../engine/transform/steps-arbitrary';
import type { Step } from '../engine/transform/step';
import { writeBlocks } from './doc-shape';
import { writeLocalSteps } from './local-to-yjs';
import { readShared } from './read-shared';
import { readRemote } from './yjs-to-steps';
import { layoutShape } from './test-support/layout-shape';
import { linkedDocs } from './test-support/peers';

const LOCAL = { local: true };
const CONTENT = ['replaceInline', 'addMark', 'removeMark', 'setAttrs', 'setIndent'];

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

describe('a step written to a shared text and read back on another client', () => {
  it('gives both clients the document the step gives the engine, with an index that matches the text', () => {
    fc.assert(
      fc.property(arbitraryDocWithStep(), ({ doc, step }) => {
        const after = applied(doc, step);
        fc.pre(after !== null && !cutsAPair(doc, step));
        const { docs, flush } = linkedDocs();
        const [mine, theirs] = docs.map((ydoc) => ydoc.getText('quoin'));
        writeBlocks(mine, 0, doc.blocks);
        flush();
        const local = { text: mine, layout: readShared(mine).layout, stale: false };
        const remote = { text: theirs, layout: readShared(theirs).layout, stale: false };
        let seen = doc;
        const kinds: string[] = [];
        theirs.observeDeep((events) => {
          for (const read of readRemote(remote, events, seen).steps) {
            kinds.push(read.stepType);
            seen = read.apply(seen).doc;
          }
        });
        docs[0].transact(() => writeLocalSteps(local, [step], [doc, after!]), LOCAL);
        flush();
        expect(sameDoc(readShared(mine).doc, after!)).toBe(true);
        expect(sameDoc(readShared(theirs).doc, after!)).toBe(true);
        expect(sameDoc(seen, after!)).toBe(true);
        expect(layoutShape(local.layout)).toEqual(layoutShape(readShared(mine).layout));
        expect(layoutShape(remote.layout)).toEqual(layoutShape(readShared(theirs).layout));
        if (CONTENT.includes(step.stepType)) expect(kinds).not.toContain('replaceDoc');
      }),
      { seed: 20261021, numRuns: 1000 },
    );
  });
});
