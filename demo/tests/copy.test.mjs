import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { builtPage, expectedPages, mainText } from './built-site.mjs';

const REPOSITORY_FILE = /\b(?:src|e2e|scripts|test)\/[\w./-]*\.(?:[cm]?[jt]sx?|css)\b/;

// The changelog records what changed in the code, so it may name the files that changed.
const readerPages = expectedPages().filter((path) => path !== 'changelog/');

describe('the copy of the built site', () => {
  for (const path of readerPages) {
    it(`on /${path} names no source or test file of the repository`, () => {
      assert.doesNotMatch(mainText(builtPage(path)), REPOSITORY_FILE);
    });
  }

  it('on the home page shows collaboration and AI, each with its recording and its live demo', () => {
    const html = builtPage('');
    for (const [clip, demo] of [
      ['quoin-collaboration.gif', 'collaboration/'],
      ['quoin-ai.gif', 'ai/'],
    ]) {
      assert.match(html, new RegExp(`src="/quoin-editor/${clip.replace('.', '\\.')}"`));
      assert.match(html, new RegExp(`href="/quoin-editor/${demo}"`));
    }
  });
});
