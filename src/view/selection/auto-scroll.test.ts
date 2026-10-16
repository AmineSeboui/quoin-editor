import { describe, expect, it, vi } from 'vitest';
import { createAutoScroll } from './auto-scroll';

function fakeWindow() {
  const frames: FrameRequestCallback[] = [];
  const win = {
    innerHeight: 600,
    scrollBy: vi.fn(),
    requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback),
    cancelAnimationFrame: () => frames.splice(0),
  };
  const nextFrame = () => frames.splice(0).forEach((callback) => callback(0));
  return { win: win as unknown as Window, scrollBy: win.scrollBy, nextFrame };
}

describe('createAutoScroll', () => {
  it('scrolls every frame while the pointer is within 40 px of the top or bottom edge, faster nearer the edge', () => {
    const { win, scrollBy, nextFrame } = fakeWindow();
    const onScroll = vi.fn();
    const scroll = createAutoScroll(win, onScroll);
    scroll.update(590);
    nextFrame();
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, 15], [0, 15]]);
    expect(onScroll).toHaveBeenCalledTimes(2);
    scroll.update(0);
    nextFrame();
    expect(scrollBy).toHaveBeenLastCalledWith(0, -20);
  });

  it('takes a wider edge when asked', () => {
    const { win, scrollBy, nextFrame } = fakeWindow();
    const scroll = createAutoScroll(win, () => {}, 48);
    scroll.update(45);
    nextFrame();
    scroll.update(560);
    nextFrame();
    scroll.update(551);
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, -2], [0, 4]]);
  });

  it('does nothing away from the edges and stops when asked', () => {
    const { win, scrollBy, nextFrame } = fakeWindow();
    const scroll = createAutoScroll(win, () => {});
    scroll.update(300);
    nextFrame();
    scroll.update(10);
    scroll.stop();
    nextFrame();
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
