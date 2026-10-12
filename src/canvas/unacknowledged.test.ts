import type { QuoinBlock } from '../types';
import { STRUCTURAL_ECHO_LIMIT, acknowledge, createUnacknowledged, remember } from './unacknowledged';

const doc = (i: number): QuoinBlock[] => [{ id: 'a', type: 'MARKDOWN', data: { markdown: String(i) } }];

function emit(count: number) {
  const outstanding = createUnacknowledged();
  const emitted = Array.from({ length: count }, (_, i) => doc(i));
  for (const blocks of emitted) remember(outstanding, blocks);
  return { outstanding, emitted };
}

describe('unacknowledged emissions', () => {
  it('keeps no more than the newest 64 alive for a host that never echoes', () => {
    const outstanding = createUnacknowledged();
    for (let i = 0; i < 200; i += 1) {
      remember(outstanding, doc(i));
      expect(outstanding.newest.length).toBeLessThanOrEqual(STRUCTURAL_ECHO_LIMIT);
    }
    expect(outstanding.newest).toHaveLength(STRUCTURAL_ECHO_LIMIT);
  });

  it('recognises the same array however late it comes back', () => {
    const { outstanding, emitted } = emit(200);

    expect(acknowledge(outstanding, emitted[0])).toBe(true);
  });

  it('matches a structural copy against the newest 64 outstanding emissions only', () => {
    const { outstanding, emitted } = emit(100);
    const oldestKept = emitted.length - STRUCTURAL_ECHO_LIMIT;

    expect(acknowledge(outstanding, structuredClone(emitted[oldestKept - 1]))).toBe(false);
    expect(acknowledge(outstanding, structuredClone(emitted[oldestKept]))).toBe(true);
  });

  it('lets go of an acknowledged emission and every older one', () => {
    const { outstanding, emitted } = emit(100);

    acknowledge(outstanding, structuredClone(emitted[89]));

    expect(outstanding.newest).toEqual(emitted.slice(90));
    expect(acknowledge(outstanding, emitted[89])).toBe(false);
    expect(acknowledge(outstanding, structuredClone(emitted[95]))).toBe(true);
  });
});
