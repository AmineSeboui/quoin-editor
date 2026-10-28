// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt, dist, importsFrom, mappedSources, reachedChunks } from '../../test/support/built-dist';

describeBuilt('the built diff entry', ['diff.js'], () => {
  it('loads no module of the canvas, the client view or React DOM', () => {
    const chunks = reachedChunks('diff.js');
    const code = chunks.map((file) => readFileSync(resolve(dist, file), 'utf8'));
    const sources = mappedSources(chunks);
    expect(sources).toEqual(expect.arrayContaining(['src/diff/QuoinDiff.tsx', 'src/view-static/html-to-react.ts']));
    expect(sources.filter((path) => /^src\/(?:view|canvas|menus|hooks|ui|extensions)\/|^src\/index\.ts$/.test(path))).toEqual([]);
    expect(code.filter((text) => importsFrom(text, 'react-dom') || /['"]use client['"]/.test(text))).toEqual([]);
  });
});
