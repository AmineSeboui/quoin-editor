import type { InlineChange } from '../engine/diff/diff-inline';
import { inlineOf, type HtmlEnv } from '../engine/render/html-env';
import { element, type HtmlNode } from '../engine/render/html-node';
import type { DiffLabels } from './diff-labels';

// Inline, so the words stay hidden on a page that does not load the stylesheet.
const VISUALLY_HIDDEN = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';

const spoken = (word: string): HtmlNode => element('span', [['class', 'quoin-diff-hidden'], ['style', VISUALLY_HIDDEN]], [`${word} `]);

/** The nodes of a region's words, those inserted in `ins` and those deleted in `del`, each led by a word a reader hears. */
export function wordNodes(changes: readonly InlineChange[], env: HtmlEnv, labels: DiffLabels): HtmlNode[] {
  return changes.flatMap(({ op, inline }) => {
    const nodes = inlineOf(inline, env);
    if (op === 'equal') return nodes;
    return [op === 'insert' ? element('ins', [], [spoken(labels.inserted), ...nodes]) : element('del', [], [spoken(labels.deleted), ...nodes])];
  });
}
