'use client';

import type { BlockRenderer } from '../../view';
import { MarkdownText, type MarkdownLook } from '../../view/react/markdown-block';
import { ListMarker } from './ListMarker';

const HEADING_LEVELS = ['mt-6 text-3xl', 'mt-5 text-2xl', 'mt-4 text-xl', 'mt-3 text-lg', 'mt-3 text-base', 'mt-3 text-sm'];

const headingStyles = (level: number) =>
  `quoin-heading mb-1 font-semibold leading-tight in-[[data-quoin-block]:first-child]:mt-0 ${HEADING_LEVELS[level - 1]}`;

const CANVAS_LOOK: MarkdownLook = { Marker: ListMarker, headingClassName: headingStyles };

export const MarkdownBlock: BlockRenderer = (props) => <MarkdownText {...props} look={CANVAS_LOOK} />;
