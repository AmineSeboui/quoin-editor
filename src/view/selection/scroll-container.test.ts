import { afterEach, describe, expect, it } from 'vitest';
import { scrollContainerOf } from './scroll-container';

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

afterEach(() => document.body.replaceChildren());

describe('scrollContainerOf', () => {
  it('picks the nearest ancestor that scrolls vertically and has more content than it shows', () => {
    const inner = box('scroll', 600);
    const root = nested(box('auto', 900), inner, box('visible', 600), box('visible', 600));
    expect(scrollContainerOf(root)).toBe(inner);
  });

  it('passes over ancestors that clip their overflow or have nothing to scroll', () => {
    const outer = box('auto', 900);
    const root = nested(outer, box('hidden', 900), box('auto', 300), box('visible', 600));
    expect(scrollContainerOf(root)).toBe(outer);
  });

  it('counts the element itself when it scrolls', () => {
    const root = nested(box('auto', 900), box('auto', 600));
    expect(scrollContainerOf(root)).toBe(root);
  });

  it('leaves the page to the window', () => {
    document.body.style.overflowY = 'auto';
    Object.defineProperties(document.body, { scrollHeight: { value: 900, configurable: true } });
    const root = nested(box('visible', 900), box('visible', 600));
    expect(scrollContainerOf(root)).toBeNull();
    document.body.removeAttribute('style');
    Reflect.deleteProperty(document.body, 'scrollHeight');
  });
});
