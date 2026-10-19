import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QuoinProvider } from '../context';
import { englishLabels } from './english-labels';
import type { QuoinLabels } from './labels';
import { resolveLabels } from './resolve-labels';
import { useLabels } from './use-labels';

const under = (labels?: QuoinLabels) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QuoinProvider value={{ blockTypes: [], labels }}>{children}</QuoinProvider>;
  };

describe('useLabels', () => {
  it('reads English under a provider given no labels', () => {
    const { result } = renderHook(() => useLabels(), { wrapper: under() });
    expect(result.current).toBe(englishLabels);
  });

  it('reads the labels the provider carries', () => {
    const labels = resolveLabels({ bold: 'Gras' });
    const { result } = renderHook(() => useLabels(), { wrapper: under(labels) });
    expect(result.current).toBe(labels);
  });

  it('throws outside a provider rather than guessing a language', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLabels())).toThrow('QuoinProvider');
    quiet.mockRestore();
  });
});
