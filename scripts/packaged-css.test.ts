// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt, dist } from '../test/support/built-dist';

// Lightning CSS, which Turbopack and Next.js use, does not know ::highlight() and reports a parse failure for it. The
// package's CSS is inlined into the consumer's own stylesheet, so the warning names their file and reads as their
// mistake. Rules a parser may refuse go on the page at runtime instead, from src/view/selection/highlight-style.ts.
const UNPARSED = ['::highlight('];

describeBuilt('the packaged stylesheet', ['styles.css'], () => {
  it('holds no rule a CSS parser in a consumer build would refuse', () => {
    const css = readFileSync(resolve(dist, 'styles.css'), 'utf8');
    for (const syntax of UNPARSED) expect(css).not.toContain(syntax);
  });
});
