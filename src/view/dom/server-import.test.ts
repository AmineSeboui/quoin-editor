// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('server import', () => {
  it('loads the renderer where no document or window exists', async () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const module = await import('./render-inline');
    expect(typeof module.renderInline).toBe('function');
    expect(typeof module.domMapOf).toBe('function');
  });

  it('loads the text reader, the diff and the caret lookup', async () => {
    const [reader, diff, caret] = await Promise.all([
      import('./read-dom-text'),
      import('./text-diff'),
      import('../navigation/caret-from-point'),
    ]);
    expect(typeof reader.readDomText).toBe('function');
    expect(diff.textDiff('a', 'b')).toEqual({ from: 0, to: 1, insert: 'b' });
    expect(caret.caretFromPoint({} as Document, 0, 0)).toBeNull();
  });
});
