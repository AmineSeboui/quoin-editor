import type { InlineChange } from '../engine/diff/diff-inline';
import { inlineOf, type HtmlEnv } from '../engine/render/html-env';
import { element, type HtmlNode } from '../engine/render/html-node';
import type { DiffLabels } from './diff-labels';
import { hiddenText } from './hidden-text';

/** Nodes in `del`, led and closed by words a reader hears, so a deletion next to an insertion reads apart from it. */
export const deletedNodes = (nodes: HtmlNode[], labels: DiffLabels): HtmlNode =>
  element('del', [], [hiddenText(`${labels.deleted} `), ...nodes, hiddenText(` ${labels.deletedEnd} `)]);

const insertedNodes = (nodes: HtmlNode[], labels: DiffLabels): HtmlNode =>
  element('ins', [], [hiddenText(`${labels.inserted} `), ...nodes, hiddenText(` ${labels.insertedEnd} `)]);

/** The nodes of a region's words, those inserted in `ins` and those deleted in `del`. */
export function wordNodes(changes: readonly InlineChange[], env: HtmlEnv, labels: DiffLabels): HtmlNode[] {
  return changes.flatMap(({ op, inline }) => {
    const nodes = inlineOf(inline, env);
    if (op === 'equal') return nodes;
    return [op === 'insert' ? insertedNodes(nodes, labels) : deletedNodes(nodes, labels)];
  });
}
