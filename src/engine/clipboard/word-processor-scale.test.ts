// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const word = readFileSync(resolve(__dirname, 'fixtures', 'word-desktop.html'), 'utf8');
const [before, rest] = word.split('<!--StartFragment-->');
const [fragment, after] = rest.split('<!--EndFragment-->');
const paste = (copies: number) => before + fragment.repeat(copies) + after;

function medianMs(html: string): number {
  const timings = Array.from({ length: 5 }, () => {
    const start = performance.now();
    fromHTML(html);
    return performance.now() - start;
  });
  return timings.sort((a, b) => a - b)[2];
}

// A Word document is read in time linear in its length: four times the paragraphs cost about four times as much, and
// well under the sixteen times a pass per paragraph over the whole paste would.
describe('a large paste from a word processor', () => {
  it('costs time in proportion to its length', () => {
    medianMs(paste(4));
    const small = medianMs(paste(10));
    const large = medianMs(paste(40));
    expect(fromHTML(paste(40))).toHaveLength(16 * 40);
    expect(large / small).toBeLessThan(8);
  }, 60_000);
});
