import { describe, expect, it } from 'vitest';
import { createEchoTracker } from './echo-tracker';

describe('echo tracker', () => {
  it('recognises the latest and lagging emissions, then treats older ones as loads', () => {
    const tracker = createEchoTracker();
    const [e1, e2, e3] = [[], [], []];
    tracker.emitted(e1);
    tracker.emitted(e2);
    tracker.emitted(e3);
    expect(tracker.classify(e1)).toBe('echo');
    expect(tracker.classify(e3)).toBe('echo');
    expect(tracker.classify(e2)).toBe('foreign');
    expect(tracker.classify([])).toBe('foreign');
  });

  it('has no cap on outstanding emissions', () => {
    const tracker = createEchoTracker();
    const all = Array.from({ length: 500 }, () => []);
    all.forEach((a) => tracker.emitted(a));
    expect(tracker.classify(all[0])).toBe('echo');
  });
});
