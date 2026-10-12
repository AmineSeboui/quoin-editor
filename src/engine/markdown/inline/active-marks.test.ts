import { describe, expect, it } from 'vitest';
import { createActiveMarks } from './active-marks';

const bold = { mark: { type: 'bold' } };
const red = { mark: { type: 'color', attrs: { color: 'red' } } };
const blue = { mark: { type: 'color', attrs: { color: 'blue' } } };
const c1 = { mark: { type: 'comment', attrs: { id: 'c1' } } };
const c2 = { mark: { type: 'comment', attrs: { id: 'c2' } } };

describe('createActiveMarks', () => {
  it('shows the innermost open range of each key in rank order', () => {
    const active = createActiveMarks();
    [red, bold, blue, c2, c1].forEach(active.open);
    expect(active.current()).toEqual([c1.mark, c2.mark, bold.mark, blue.mark]);
    active.close(blue);
    expect(active.current()).toEqual([c1.mark, c2.mark, bold.mark, red.mark]);
  });

  it('keeps the top while ranges below it close, then drops them all once the top closes', () => {
    const active = createActiveMarks();
    const green = { mark: { type: 'color', attrs: { color: 'green' } } };
    [red, green, blue].forEach(active.open);
    active.close(red);
    active.close(green);
    expect(active.current()).toEqual([blue.mark]);
    active.close(blue);
    expect(active.current()).toEqual([]);
  });

  it('ignores closing a range that was never opened', () => {
    const active = createActiveMarks();
    active.open(bold);
    active.close(red);
    expect(active.current()).toEqual([bold.mark]);
  });

  it('returns the same set until a range opens or the top of a key closes', () => {
    const active = createActiveMarks();
    const outer = { mark: { type: 'bold' } };
    [outer, bold].forEach(active.open);
    const before = active.current();
    active.close(outer);
    expect(active.current()).toBe(before);
    active.close(bold);
    expect(active.current()).not.toBe(before);
  });

  it('returns the same set when the marks shown come back to it', () => {
    const active = createActiveMarks();
    [c1, bold].forEach(active.open);
    const before = active.current();
    active.close(bold);
    active.open({ mark: { type: 'bold' } });
    expect(active.current()).toBe(before);
    active.open(red);
    active.close(red);
    expect(active.current()).toBe(before);
  });

  it('shows a reopened mark after the marks that sort equal to it', () => {
    const active = createActiveMarks();
    const composed = { mark: { type: 'comment', attrs: { id: '\u00e9' } } };
    const decomposed = { mark: { type: 'comment', attrs: { id: 'e\u0301' } } };
    [composed, decomposed].forEach(active.open);
    expect(active.current()).toEqual([composed.mark, decomposed.mark]);
    active.close(composed);
    active.open({ mark: { type: 'comment', attrs: { id: '\u00e9' } } });
    expect(active.current()).toEqual([decomposed.mark, composed.mark]);
  });
});
