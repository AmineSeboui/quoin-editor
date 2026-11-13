import { afterEach, describe, expect, it } from 'vitest';
import { scrollContainersOf } from './scroll-container';

function box(overflowY: string, scrollHeight: number, clientHeight = 300): HTMLElement {
  const element = document.createElement('div');
  element.style.overflowY = overflowY;
  Object.defineProperties(element, { scrollHeight: { value: scrollHeight }, clientHeight: { value: clientHeight } });
  return element;
}

function nested(...chain: HTMLElement[]): HTMLElement {
  chain.reduce((parent, child) => {
    parent.append(child);
    return child;
  });
  document.body.append(chain[0]);
  return chain[chain.length - 1];
}

function scrollingBody(): void {
  document.body.style.overflowY = 'auto';
  Object.defineProperties(document.body, {
    scrollHeight: { value: 900, configurable: true },
    clientHeight: { value: 300, configurable: true },
  });
}

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  Reflect.deleteProperty(document.body, 'scrollHeight');
  Reflect.deleteProperty(document.body, 'clientHeight');
});

describe('scrollContainersOf', () => {
  it('lists every ancestor that scrolls vertically and has more content than it shows, nearest first', () => {
    const [outer, inner] = [box('auto', 900), box('scroll', 600)];
    const root = nested(outer, inner, box('visible', 600), box('visible', 600));
    expect(scrollContainersOf(root)).toEqual([inner, outer]);
  });

  it('passes over ancestors that clip their overflow or have nothing to scroll', () => {
    const outer = box('auto', 900);
    const root = nested(outer, box('hidden', 900), box('auto', 300), box('visible', 600));
    expect(scrollContainersOf(root)).toEqual([outer]);
  });

  it('counts the element itself when it scrolls', () => {
    const root = nested(box('auto', 900), box('auto', 600));
    expect(scrollContainersOf(root)[0]).toBe(root);
  });

  it('leaves the page to the window, where the body hands its overflow to the window', () => {
    scrollingBody();
    const root = nested(box('visible', 900), box('visible', 600));
    expect(scrollContainersOf(root)).toEqual([]);
  });

  it('counts the body when the page keeps its own overflow, so the body scrolls rather than the window', () => {
    document.documentElement.style.overflowY = 'hidden';
    scrollingBody();
    const root = nested(box('visible', 900), box('visible', 600));
    expect(scrollContainersOf(root)).toEqual([document.body]);
  });

  it('goes on past a shadow root to the elements around its host', () => {
    const outer = box('auto', 900);
    const host = nested(outer, box('visible', 600));
    const root = document.createElement('div');
    host.attachShadow({ mode: 'open' }).append(root);
    expect(scrollContainersOf(root)).toEqual([outer]);
  });

  it('follows an element slotted into a shadow root through the slot, inside the shadow tree first', () => {
    const outer = box('auto', 900);
    const host = nested(outer, box('visible', 600));
    const pane = box('auto', 900);
    pane.append(document.createElement('slot'));
    host.attachShadow({ mode: 'open' }).append(pane);
    const root = document.createElement('div');
    host.append(root);
    expect(scrollContainersOf(root)).toEqual([pane, outer]);
  });
});
