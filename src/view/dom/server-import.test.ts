// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('server import', () => {
  it('loads the renderer where no document or window exists', async () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const module = await import('./render-inline');
    expect(typeof module.renderInline).toBe('function');
    expect(typeof module.domMapOf).toBe('function');
    expect(typeof module.isRendering).toBe('function');
  });
});
