import { createElement, type ReactNode } from 'react';
import type { CodeHighlighter } from '../blocks/code/code-highlighter';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { createSchema } from '../engine/schema/create-schema';
import { documentNodes } from '../engine/render/document-nodes';
import type { HtmlElement } from '../engine/render/html-node';
import type { HTMLOptions } from '../engine/render/to-html';
import type { AnyBlockDefinition } from '../registry';
import { reactNodes } from '../view-static/html-to-react';
import { viewRenderer } from '../view-static/view-renderer';
import { diffRenderer } from './diff-block';
import { diffDocument } from './diff-document';
import { resolveDiffLabels, type DiffLabels } from './diff-labels';
import { settledDiff } from './diff-tree';

export type QuoinDiffProps = {
  /** The older version. */
  before: readonly QuoinBlock[];
  /** The newer version. */
  after: readonly QuoinBlock[];
  /** The definitions of the host's own block types, each drawn by its `preview`, as in `QuoinView`. */
  blockTypes?: readonly AnyBlockDefinition[];
  /** Strings to show and speak in place of the English ones. */
  labels?: Partial<DiffLabels>;
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: HTMLOptions['resolveAssetUrl'];
  /** Its markup is trusted and inserted as it is. */
  renderMath?: HTMLOptions['renderMath'];
  /** Highlights the code of code blocks; without it their code is plain text. */
  highlight?: CodeHighlighter;
  className?: string;
};

/**
 * The changes between two versions of a document, read-only: blocks added, removed, moved and changed, and in a changed
 * block the words inserted and deleted. Drawn with the HTML `QuoinView` writes, using no hook, effect or browser API,
 * so it renders in a React Server Component.
 */
export function QuoinDiff({ before, after, blockTypes, labels, highlight, className, ...options }: QuoinDiffProps) {
  const words = resolveDiffLabels(labels);
  const schema = createSchema();
  const { blocks, marks } = diffDocument(before, after, schema);
  const slots = new Map<HtmlElement, ReactNode>();
  const render = diffRenderer(marks, words, viewRenderer({ blockTypes, highlight }, slots));
  const nodes = documentNodes(blocks, { ...options, schema, taskLabel: words.emptyTask }, render);
  return createElement('div', { className: className ? `quoin-diff ${className}` : 'quoin-diff' }, ...reactNodes(settledDiff(nodes), slots));
}
