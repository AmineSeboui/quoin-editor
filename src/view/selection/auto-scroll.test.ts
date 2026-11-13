import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoScroll } from './auto-scroll';

let frames: FrameRequestCallback[] = [];
const nextFrame = () => frames.splice(0).forEach((callback) => callback(0));

function element(parent: HTMLElement = document.body): HTMLElement {
  const child = document.createElement('div');
  parent.append(child);
  return child;
}

// A pane scrolled to the middle of its content, which moves by what it is asked to scroll by until it reaches an end.
function pane(top: number, clientHeight: number, parent?: HTMLElement) {
  const container = element(parent);
  container.style.overflowY = 'auto';
  Object.defineProperties(container, {
    scrollHeight: { value: clientHeight * 3 },
    clientHeight: { value: clientHeight },
    clientTop: { value: 2 },
  });
  container.scrollTop = clientHeight;
  container.getBoundingClientRect = () => ({ top: top - 2 }) as DOMRect;
  const scrollBy = vi.fn((_x: number, y: number) => {
    container.scrollTop = Math.min(Math.max(container.scrollTop + y, 0), clientHeight * 2);
  });
  container.scrollBy = scrollBy as unknown as HTMLElement['scrollBy'];
  return { container, scrollBy };
}

beforeEach(() => {
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => void frames.splice(0));
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('createAutoScroll', () => {
  it('scrolls every frame while the pointer is within 40 px of the top or bottom edge, faster nearer the edge', () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const onScroll = vi.fn();
    const scroll = createAutoScroll(element(), onScroll);
    scroll.update(window.innerHeight - 10);
    nextFrame();
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, 15], [0, 15]]);
    expect(onScroll).toHaveBeenCalledTimes(2);
    scroll.update(0);
    nextFrame();
    expect(scrollBy).toHaveBeenLastCalledWith(0, -20);
  });

  it('takes a wider edge when asked', () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const scroll = createAutoScroll(element(), () => {}, 48);
    scroll.update(45);
    nextFrame();
    scroll.update(window.innerHeight - 40);
    nextFrame();
    scroll.update(window.innerHeight - 49);
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, -2], [0, 4]]);
  });

  it('does nothing away from the edges and stops when asked', () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const scroll = createAutoScroll(element(), () => {});
    scroll.update(300);
    nextFrame();
    scroll.update(10);
    scroll.stop();
    nextFrame();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('scrolls the container the element sits in from the edges of its content box, rather than the window', () => {
    const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { container, scrollBy } = pane(100, 300);
    const scroll = createAutoScroll(element(container), () => {});
    scroll.update(390);
    nextFrame();
    scroll.update(110);
    nextFrame();
    scroll.update(250);
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, 15], [0, -15]]);
    expect(windowScroll).not.toHaveBeenCalled();
  });

  it('hands the scrolling on to the container around once the nearest one reaches its end', () => {
    const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const outer = pane(0, window.innerHeight);
    const inner = pane(0, window.innerHeight, outer.container);
    inner.container.scrollTop = window.innerHeight * 2 - 15;
    const scroll = createAutoScroll(element(inner.container), () => {});
    scroll.update(window.innerHeight - 10);
    nextFrame();
    nextFrame();
    nextFrame();
    expect(inner.scrollBy.mock.calls).toEqual([[0, 15]]);
    expect(outer.scrollBy.mock.calls).toEqual([[0, 15], [0, 15]]);
    expect(windowScroll).not.toHaveBeenCalled();
  });

  it('hands the scrolling on to the window once every container has reached its end', () => {
    const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { container, scrollBy } = pane(0, window.innerHeight);
    container.scrollTop = 0;
    const scroll = createAutoScroll(element(container), () => {});
    scroll.update(10);
    nextFrame();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(windowScroll).toHaveBeenCalledWith(0, -15);
  });

  it('measures a container taller than the window from the edges of the window', () => {
    const { container, scrollBy } = pane(-200, window.innerHeight + 400);
    const scroll = createAutoScroll(element(container), () => {});
    scroll.update(10);
    nextFrame();
    scroll.update(window.innerHeight - 10);
    nextFrame();
    expect(scrollBy.mock.calls).toEqual([[0, -15], [0, 15]]);
  });
});
