import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

class FakeQueryList extends EventTarget {
  constructor(public matches: boolean) {
    super();
  }
}

function fakeMatchMedia(matches: boolean): FakeQueryList {
  const list = new FakeQueryList(matches);
  vi.stubGlobal('matchMedia', () => list);
  return list;
}

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery', () => {
  it('follows the query as it starts and stops matching', () => {
    const list = fakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(pointer: coarse)', false));
    expect(result.current).toBe(false);
    act(() => {
      list.matches = true;
      list.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(true);
    act(() => {
      list.matches = false;
      list.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(false);
  });

  it('answers with the fallback where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useMediaQuery('(pointer: coarse)', true)).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery('(pointer: coarse)', false)).result.current).toBe(false);
  });

  it('stops listening once unmounted', () => {
    const list = fakeMatchMedia(false);
    const added = vi.spyOn(list, 'addEventListener');
    const removed = vi.spyOn(list, 'removeEventListener');
    const { unmount } = renderHook(() => useMediaQuery('(pointer: coarse)', false));
    unmount();
    expect(added.mock.calls.map(([type]) => type)).toEqual(['change']);
    expect(removed.mock.calls).toEqual(added.mock.calls);
  });
});
