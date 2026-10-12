import { describe, expect, it } from 'vitest';
import { sanitizeHref } from './urls';

describe('sanitizeHref', () => {
  it.each([
    ['https://a.b/c?d#e', 'https://a.b/c?d#e'],
    ['  http://x.y  ', 'http://x.y'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['tel:+123', 'tel:+123'],
    ['mention:user:42', 'mention:user:42'],
    ['/docs/a', '/docs/a'],
    ['../a', '../a'],
    ['#section', '#section'],
    ['page.html', 'page.html'],
  ])('keeps %s', (input, expected) => expect(sanitizeHref(input)).toBe(expected));

  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', ' data:text/html,x', 'vbscript:x', 'file:///etc/passwd', 'java\nscript:x'])(
    'rejects %s',
    (input) => expect(sanitizeHref(input)).toBeNull(),
  );
});
