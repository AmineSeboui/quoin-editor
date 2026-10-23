// @vitest-environment node
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { entryBundle } from './measure-size.mjs';

const root = resolve(__dirname, '..');
const CORE = ['index', 'headless', 'engine'];

// Words only each entry's own code holds: the classes it draws and, for the Word export, the parts of its file.
const OWN: Record<string, readonly string[]> = {
  comments: ['quoin-comments-rail', 'quoin-comment-pending'],
  ai: ['quoin-ai-ghost', 'quoin-ai-replaced'],
  view: ['quoin-view'],
  diff: ['quoin-diff', 'data-diff'],
  docx: ['wordprocessingml', 'word/document.xml'],
};

const files = [...CORE, ...Object.keys(OWN)].map((name) => `${name}.js`);

describeBuilt('the built core entries', files, () => {
  it.each(Object.entries(OWN))('hold none of the %s entry, whose own code holds its words', async (name, words) => {
    const own = await entryBundle(root, name);
    for (const word of words) expect(own).toContain(word);
    for (const core of CORE) {
      const code = await entryBundle(root, core);
      for (const word of words) expect(code, `${word} in ${core}`).not.toContain(word);
    }
  });
});
