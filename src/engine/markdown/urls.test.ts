import { describe, expect, it } from 'vitest';
import { sanitizeAssetUrl, sanitizeHref } from './urls';

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

describe('sanitizeAssetUrl', () => {
  it.each([
    ['https://cdn.quoin.dev/a.pdf', 'https://cdn.quoin.dev/a.pdf'],
    [' http://x.y/a.png ', 'http://x.y/a.png'],
    ['blob:https://quoin.dev/1f2e', 'blob:https://quoin.dev/1f2e'],
    ['data:application/pdf;base64,JVBERg==', 'data:application/pdf;base64,JVBERg=='],
    ['/files/a.pdf', '/files/a.pdf'],
    ['a.pdf', 'a.pdf'],
  ])('keeps %s', (input, expected) => expect(sanitizeAssetUrl(input)).toBe(expected));

  it.each(['javascript:alert(1)', 'VBScript:x', 'file:///etc/passwd', 'mailto:a@b.c', 'tel:1', 'ms-word:ofe|u|x', 'java\tscript:x'])(
    'rejects %s',
    (input) => expect(sanitizeAssetUrl(input)).toBeNull(),
  );
});
