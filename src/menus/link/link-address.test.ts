import { describe, expect, it } from 'vitest';
import { linkAddress } from './link-address';

describe('linkAddress', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['  www.quoin.dev/docs  ', 'https://www.quoin.dev/docs'],
    ['docs.example.com/a?b=1#c', 'https://docs.example.com/a?b=1#c'],
  ])('completes the bare domain %j with https', (typed, href) => {
    expect(linkAddress(typed)).toBe(href);
  });

  it.each(['https://quoin.dev', 'mailto:ada@example.com', '/docs', '#top', '?page=2', './guide.html', 'readme'])(
    'keeps %j as it is',
    (typed) => {
      expect(linkAddress(typed)).toBe(typed);
    },
  );

  it.each(['javascript:alert(1)', 'data:text/html,x', '', '   '])('refuses %j', (typed) => {
    expect(linkAddress(typed)).toBeNull();
  });
});
