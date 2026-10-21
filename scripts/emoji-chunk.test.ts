// @vitest-environment node
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { entryBundle, measureEntries } from './measure-size.mjs';
import { lazyChunks } from './package-entries.mjs';

const root = resolve(__dirname, '..');
// Shortcodes of the dataset, and a label of the emoji feature, that no other code of the package holds.
const DATASET = ['smiling_face_with_three_hearts', 'face_with_head_bandage'];
const FEATURE = 'Emoji could not be loaded';

describeBuilt('the built emoji dataset', ['index.js', 'headless.js', 'emoji.js', 'emoji-data.js', 'catalogue.js'], () => {
  it('reaches neither the main nor the headless entry, which hold none of the emoji feature either', async () => {
    for (const name of ['index', 'headless']) {
      const code = await entryBundle(root, name);
      for (const word of [...DATASET, FEATURE, 'emoji-data']) expect(code).not.toContain(word);
    }
  });

  it('is loaded on demand by the emoji and catalogue entries, which leave it out of their bundles', async () => {
    for (const name of ['emoji', 'catalogue']) {
      const code = await entryBundle(root, name);
      expect(code).toContain(FEATURE);
      expect(code).toMatch(/import\(\s*["']\.\/emoji-data\.js["']\s*\)/);
      for (const word of DATASET) expect(code).not.toContain(word);
    }
  });

  it('is a chunk of its own, held to 60,000 B gzip', async () => {
    const code = await entryBundle(root, 'emoji-data');
    for (const word of DATASET) expect(code).toContain(word);
    const chunk = (await measureEntries(root, [], lazyChunks)).find(({ name }) => name === 'emoji-data');
    expect(chunk).toMatchObject({ kind: 'lazy', budget: 60_000, ok: true });
  });
});
