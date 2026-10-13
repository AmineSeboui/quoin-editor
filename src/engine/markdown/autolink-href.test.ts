import { describe, expect, it } from 'vitest';
import { autolinkHref } from './autolink-href';

describe('autolinkHref', () => {
  it('turns a bare www address into an https link', () => {
    expect(autolinkHref('www.example.com/a?b=1')).toBe('https://www.example.com/a?b=1');
    expect(autolinkHref('WWW.Example.com')).toBe('https://WWW.Example.com');
  });

  it('keeps safe urls as they are and refuses unsafe ones', () => {
    expect(autolinkHref('https://a.b')).toBe('https://a.b');
    expect(autolinkHref('mailto:a@b.c')).toBe('mailto:a@b.c');
    expect(autolinkHref('javascript:alert(1)')).toBeNull();
    expect(autolinkHref('www.a.b\u0001')).toBeNull();
  });
});
