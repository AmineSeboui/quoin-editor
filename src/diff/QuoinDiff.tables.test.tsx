// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { linkedDocs, peer } from '../yjs/test-support/peers';
import { QuoinDiff } from './QuoinDiff';

const rows = [
  ['Name', 'Role'],
  ['Ada', 'Engineer'],
];
const table = (data: Record<string, unknown>): QuoinBlock => ({ id: 't', type: 'TABLE', data: { rows, header: true, ...data } });
const markup = (before: QuoinBlock[], after: QuoinBlock[]) => renderToStaticMarkup(<QuoinDiff before={before} after={after} />);

describe('QuoinDiff on a table written two ways', () => {
  it('leaves a table unmarked whose columns have no alignment, whether written as none or as nulls', () => {
    for (const align of [[null, null], []]) {
      expect(markup([table({})], [table({ align })])).not.toContain('data-diff');
      expect(markup([table({ align })], [table({})])).not.toContain('data-diff');
    }
  });

  it('still marks a column given an alignment', () => {
    expect(markup([table({})], [table({ align: [null, 'right'] })])).toContain('data-diff="changed"');
  });

  it("leaves unmarked the same table as two collaborators' editors give it back", () => {
    const link = linkedDocs();
    const one = peer(link.docs[0], 'a', [table({})]);
    link.flush();
    const two = peer(link.docs[1], 'b');
    expect(two.editor.getBlocks()).toHaveLength(1);
    expect(markup(one.editor.getBlocks(), two.editor.getBlocks())).not.toContain('data-diff');
  });
});
