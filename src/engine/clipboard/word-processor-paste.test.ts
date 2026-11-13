// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pasteShape, WORD_PROCESSOR_PASTES } from '../test-support/word-processor-pastes';
import { fromHTML } from './from-html';

const fixture = (name: string) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf8');

function shapeOf(html: string) {
  let n = 0;
  return fromHTML(html, { newId: () => `w${++n}` }).map(pasteShape);
}

const LEFT_AS_HTML = /<\/?(?:p|div|li|ul|ol|h[1-6]|table|tr|td|th|img|font|b|i|o:p|w:sdt)\b/i;

describe('paste from a word processor', () => {
  it.each(WORD_PROCESSOR_PASTES)('keeps the structure of a paste from %s', (_source, name, expected) => {
    expect(shapeOf(fixture(name))).toEqual(expected);
  });

  it.each(WORD_PROCESSOR_PASTES)('leaves no markup of a paste from %s as text', (_source, name) => {
    const markdown = shapeOf(fixture(name)).filter((block) => typeof block === 'string');
    expect(markdown.filter((line) => LEFT_AS_HTML.test(line))).toEqual([]);
  });
});
