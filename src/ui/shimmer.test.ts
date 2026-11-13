import css from './shimmer.css?raw';
import styles from '../styles.css?raw';

const blockAfter = (marker: string) => {
  const start = css.indexOf(marker);
  return start === -1 ? '' : css.slice(start, css.indexOf('}\n}', start) + 3);
};

describe('the shimmer', () => {
  it('is part of the stylesheet, in the components layer', () => {
    expect(styles).toContain('@import "./ui/shimmer.css" layer(quoin.components);');
  });

  it('names its animation and every custom property it sets after quoin', () => {
    expect(css).toContain('@keyframes quoin-shimmer');
    const properties = [...css.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name);
    expect(properties.length).toBeGreaterThan(0);
    expect(properties.filter((name) => !name.startsWith('--quoin-'))).toEqual([]);
  });

  it.each(['prefers-reduced-motion: reduce', 'forced-colors: active'])('shows plain text under %s', (query) => {
    const block = blockAfter(query);
    expect(block).toContain('background-image: none');
    expect(block).toContain('-webkit-text-fill-color: currentColor');
  });

  it('runs the other way on a right-to-left page', () => {
    expect(css).toMatch(/\.quoin-shimmer:dir\(rtl\)\s*\{\s*animation-direction: reverse;/);
  });
});
