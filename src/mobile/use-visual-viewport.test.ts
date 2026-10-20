import { act, renderHook } from '@testing-library/react';
import { useVisualViewport } from './use-visual-viewport';

class FakeViewport extends EventTarget {
  offsetTop = 0;
  height = 800;
  width = 400;
}

function fakeViewport(): FakeViewport {
  const viewport = new FakeViewport();
  vi.stubGlobal('visualViewport', viewport);
  return viewport;
}

afterEach(() => vi.unstubAllGlobals());

describe('useVisualViewport', () => {
  it('is null where the browser has no visual viewport', () => {
    vi.stubGlobal('visualViewport', undefined);
    const { result } = renderHook(() => useVisualViewport());
    expect(result.current).toBeNull();
  });

  it('follows the viewport as the keyboard resizes it and the page scrolls under it', () => {
    const viewport = fakeViewport();
    const { result } = renderHook(() => useVisualViewport());
    expect(result.current).toEqual({ offsetTop: 0, height: 800, width: 400 });
    act(() => {
      viewport.height = 460;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ offsetTop: 0, height: 460, width: 400 });
    act(() => {
      viewport.offsetTop = 120;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toEqual({ offsetTop: 120, height: 460, width: 400 });
  });

  it('draws nothing again for an event that moves nothing', () => {
    const viewport = fakeViewport();
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useVisualViewport();
    });
    const before = renders;
    act(() => void viewport.dispatchEvent(new Event('scroll')));
    expect(renders).toBe(before);
  });

  it('stops listening once unmounted', () => {
    const viewport = fakeViewport();
    const added = vi.spyOn(viewport, 'addEventListener');
    const removed = vi.spyOn(viewport, 'removeEventListener');
    const { unmount } = renderHook(() => useVisualViewport());
    unmount();
    expect(removed.mock.calls).toEqual(added.mock.calls);
    expect(added.mock.calls.map(([type]) => type).sort()).toEqual(['resize', 'scroll']);
  });
});
