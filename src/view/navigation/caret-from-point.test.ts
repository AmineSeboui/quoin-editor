import { describe, expect, it } from 'vitest';
import { caretFromPoint } from './caret-from-point';

describe('caretFromPoint', () => {
  const node = document.createTextNode('x');

  it('prefers caretPositionFromPoint', () => {
    const doc = { caretPositionFromPoint: () => ({ offsetNode: node, offset: 1 }) } as unknown as Document;
    expect(caretFromPoint(doc, 1, 2)).toEqual({ node, offset: 1 });
  });

  it('falls back to caretRangeFromPoint, then null', () => {
    const doc = { caretRangeFromPoint: () => ({ startContainer: node, startOffset: 0 }) } as unknown as Document;
    expect(caretFromPoint(doc, 1, 2)).toEqual({ node, offset: 0 });
    expect(caretFromPoint({} as Document, 1, 2)).toBeNull();
  });

  it('passes the point through and keeps the document as the receiver', () => {
    const calls: unknown[][] = [];
    const doc = {
      caretPositionFromPoint(this: unknown, ...args: unknown[]) {
        calls.push([this === doc, ...args]);
        return { offsetNode: node, offset: 3 };
      },
      caretRangeFromPoint: () => ({ startContainer: node, startOffset: 9 }),
    } as unknown as Document;
    expect(caretFromPoint(doc, 10, 20)).toEqual({ node, offset: 3 });
    expect(calls).toEqual([[true, 10, 20]]);
  });

  it('reports null when the browser finds no position', () => {
    expect(caretFromPoint({ caretPositionFromPoint: () => null } as unknown as Document, 1, 2)).toBeNull();
    expect(caretFromPoint({ caretRangeFromPoint: () => null } as unknown as Document, 1, 2)).toBeNull();
  });
});
