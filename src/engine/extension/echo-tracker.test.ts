import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { createEchoTracker, STRUCTURAL_ECHO_WINDOW } from './echo-tracker';

const doc = (markdown: string): QuoinBlock[] => [{ id: 'a', type: 'MARKDOWN', data: { markdown } }];

function tracking(...docs: QuoinBlock[][]) {
  const tracker = createEchoTracker();
  docs.forEach((blocks) => tracker.emitted(blocks));
  return tracker;
}

describe('echo tracker', () => {
  it('recognises the latest and lagging emissions, then treats older ones as loads', () => {
    const [e1, e2, e3] = [[], [], []];
    const tracker = tracking(e1, e2, e3);
    expect(tracker.classify(e1)).toBe('echo');
    expect(tracker.classify(e3)).toBe('echo');
    expect(tracker.classify(e2)).toBe('foreign');
    expect(tracker.classify([])).toBe('foreign');
  });

  it('has no cap on outstanding emissions handed back as the same array', () => {
    const all = Array.from({ length: STRUCTURAL_ECHO_WINDOW * 2 }, (_, i) => doc(String(i)));
    expect(tracking(...all).classify(all[0])).toBe('echo');
  });

  it('recognises a structural copy of an outstanding emission and acknowledges the older ones', () => {
    const [e1, e2, e3] = [doc('1'), doc('12'), doc('123')];
    const tracker = tracking(e1, e2, e3);
    expect(tracker.classify(structuredClone(e2))).toBe('echo');
    expect(tracker.classify(structuredClone(e1))).toBe('foreign');
    expect(tracker.classify(e1)).toBe('foreign');
    expect(tracker.classify(structuredClone(e3))).toBe('echo');
    expect(tracker.classify(structuredClone(e3))).toBe('foreign');
  });

  it('matches a copy to the oldest outstanding emission it equals', () => {
    const tracker = tracking(doc('1'), doc('12'), doc('1'));
    for (const markdown of ['1', '12', '1']) expect(tracker.classify(doc(markdown))).toBe('echo');
    expect(tracker.classify(doc('1'))).toBe('foreign');
  });

  it('recognises a copy of an emission that reordered the blocks of an older one', () => {
    const [a, b] = [doc('a')[0], { ...doc('b')[0], id: 'b' }];
    const tracker = tracking([a, b], [b, a]);
    expect(tracker.classify(structuredClone([b, a]))).toBe('echo');
    expect(tracker.classify(structuredClone([a, b]))).toBe('foreign');
  });

  it('tells a copy apart by length, id, type, indent or data', () => {
    const tracker = tracking([{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' }, indent: 1 }]);
    const others: QuoinBlock[][] = [
      [],
      [{ id: 'b', type: 'MARKDOWN', data: { markdown: 'x' }, indent: 1 }],
      [{ id: 'a', type: 'CODE', data: { markdown: 'x' }, indent: 1 }],
      [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } }],
      [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'y' }, indent: 1 }],
    ];
    for (const other of others) expect(tracker.classify(other)).toBe('foreign');
  });

  it('compares copies with the newest outstanding emissions only', () => {
    const all = Array.from({ length: STRUCTURAL_ECHO_WINDOW + 1 }, (_, i) => doc(String(i)));
    const tracker = tracking(...all);
    expect(tracker.classify(doc('0'))).toBe('foreign');
    expect(tracker.classify(doc('1'))).toBe('echo');
  });

  it('forgets every outstanding emission', () => {
    const e1 = doc('1');
    const tracker = tracking(e1);
    tracker.forgetAll();
    expect(tracker.classify(structuredClone(e1))).toBe('foreign');
    expect(tracker.classify(e1)).toBe('foreign');
  });
});
