import { describe, expect, it } from 'vitest';
import { linkAddress } from './link-address';

const bestOf = (runs: number, work: () => void) => {
  let best = Infinity;
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    work();
    best = Math.min(best, performance.now() - start);
  }
  return best;
};

describe('linkAddress', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['  www.quoin.dev/docs  ', 'https://www.quoin.dev/docs'],
    ['docs.example.com/a?b=1#c', 'https://docs.example.com/a?b=1#c'],
  ])('completes the bare domain %j with https', (typed, href) => {
    expect(linkAddress(typed)).toBe(href);
  });

  it.each([
    ['ada@example.com', 'mailto:ada@example.com'],
    ['  Ada.Lovelace+notes@mail.example.co.uk  ', 'mailto:Ada.Lovelace+notes@mail.example.co.uk'],
  ])('sends the email address %j to mailto', (typed, href) => {
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

  it.each(['not a url with spaces', 'https://quoin.dev/a b', 'example .com', 'docs\tpage'])(
    'refuses %j, which has whitespace inside it',
    (typed) => {
      expect(linkAddress(typed)).toBeNull();
    },
  );

  it.each([
    ['an email address whose domain ends in a slash', (n: number) => `a@${'a.'.repeat(n)}/`],
    ['an email address with a second @', (n: number) => `a@${'a.'.repeat(n)}@`],
    ['a domain of dots', (n: number) => `a${'.'.repeat(2 * n)}`],
  ])('reads %s pasted at many kilobytes in time that grows with its length alone', (_, pasted) => {
    const read = (n: number) => () => {
      for (let i = 0; i < 10; i++) linkAddress(pasted(n));
    };
    read(2000)();
    const short = bestOf(5, read(2000));
    const long = bestOf(5, read(16000));
    expect(long / short).toBeLessThan(24);
  });
});
