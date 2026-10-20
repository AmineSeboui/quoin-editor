import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useLayoutEffect } from 'react';

const SOURCES = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

describe('useIsomorphicLayoutEffect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('is a layout effect in the browser', async () => {
    const { useIsomorphicLayoutEffect } = await import('./use-isomorphic-layout-effect');
    expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect);
  });

  it('is a passive effect on the server, where React 18 warns about layout effects', async () => {
    vi.stubGlobal('document', undefined);
    vi.resetModules();
    const { useIsomorphicLayoutEffect } = await import('./use-isomorphic-layout-effect');
    expect(useIsomorphicLayoutEffect).toBe(useEffect);
  });

  it('is what every source uses in place of useLayoutEffect', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.endsWith('/use-isomorphic-layout-effect.ts'))
      .filter(([, source]) => /\buseLayoutEffect\b/.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('finds the components and hooks that run layout work', () => {
    const paths = Object.keys(SOURCES);
    expect(paths.some((path) => path.endsWith('/view/react/EditableRegion.tsx'))).toBe(true);
    expect(paths.some((path) => path.endsWith('/view/react/use-quoin-editor.ts'))).toBe(true);
  });
});
