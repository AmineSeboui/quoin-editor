import { createElement, type ReactNode } from 'react';
import type { CodeHighlighter } from '../blocks/code/code-highlighter';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { documentNodes } from '../engine/render/document-nodes';
import type { HtmlElement } from '../engine/render/html-node';
import type { HTMLOptions } from '../engine/render/to-html';
import type { AnyBlockDefinition } from '../registry';
import { reactNodes } from './html-to-react';
import { viewRenderer } from './view-renderer';

export type QuoinViewProps = {
  blocks: readonly QuoinBlock[];
  /**
   * The definitions of the host's own block types, each drawn by its `preview`. Called during a server render, so a
   * preview of a React Server Component tree must use no client hooks. A type Quoin draws itself keeps Quoin's drawing.
   */
  blockTypes?: readonly AnyBlockDefinition[];
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: HTMLOptions['resolveAssetUrl'];
  /** Its markup is trusted and inserted as it is. */
  renderMath?: HTMLOptions['renderMath'];
  /** Highlights the code of code blocks; without it their code is plain text. */
  highlight?: CodeHighlighter;
  /** Embeds as links by default, or as sandboxed frames for the pages of known providers. */
  embeds?: HTMLOptions['embeds'];
  /** Tried before the built in providers, in order. Only used when `embeds` is `'iframe'`. */
  embedProviders?: HTMLOptions['embedProviders'];
  /** The title of a frame given its provider's name, the name itself by default. */
  frameTitle?: HTMLOptions['frameTitle'];
  /** The accessible name of a task checkbox whose item has no text, `'Task'` by default. */
  taskLabel?: HTMLOptions['taskLabel'];
  className?: string;
};

/**
 * A read-only document drawn with the HTML `toHTML` writes, as React elements. It uses no hook, effect or browser API,
 * so it renders in a React Server Component and in a static export. Toggles are native `details`. A canvas that is
 * read-only stays the interactive way to show a document in the browser.
 */
export function QuoinView({ blocks, blockTypes, highlight, className, ...options }: QuoinViewProps) {
  const slots = new Map<HtmlElement, ReactNode>();
  const nodes = documentNodes(blocks, options, viewRenderer({ blockTypes, highlight }, slots));
  return createElement('div', { className }, ...reactNodes(nodes, slots));
}
