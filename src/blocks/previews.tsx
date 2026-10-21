'use client';

import { useQuoin } from '../context';
import { useLabels } from '../i18n/use-labels';
import type { BlockPreviewProps } from '../types';
import { captionText } from './caption-markdown';
import { HighlightOverlay } from './code/HighlightOverlay';
import { imageSource } from './image/image-source';
import { str } from '../engine/blocks/data-fields';

const HINT = 'text-sm text-muted-foreground';

/**
 * One colour per tone, carrying both the rule and the wash behind it. Until 0.4.0 the
 * five tones were mapped onto whatever this palette already had, which gave info, tip
 * and success the same near-black rule and all five the same grey fill: the editor
 * offered five choices that rendered as three, and the choice a writer made was lost.
 *
 * The wash is 15% of a mid-lightness colour, which is light enough to keep body copy
 * on it and saturated enough to read as the tone rather than as grey.
 */
export const TONE: Record<string, string> = {
  info: 'border-info bg-info/15',
  tip: 'border-primary bg-primary/15',
  warning: 'border-warning bg-warning/15',
  success: 'border-success bg-success/15',
  danger: 'border-destructive bg-destructive/15',
};

export function MarkdownPreview({ data }: BlockPreviewProps) {
  const labels = useLabels();
  const markdown = str(data.markdown);
  if (markdown.trim() === '') return <p className={HINT}>{labels.emptyMarkdown}</p>;
  return <div className="whitespace-pre-wrap text-base leading-7">{markdown}</div>;
}

export function CodePreview({ data }: BlockPreviewProps) {
  return (
    <div dir="ltr" className="quoin-code quoin-code-scroll pt-3">
      <HighlightOverlay code={str(data.code)} language={str(data.language)} />
    </div>
  );
}

export function ImagePreview({ data }: BlockPreviewProps) {
  const { resolveAssetUrl, labels } = useQuoin();
  const src = imageSource(data, resolveAssetUrl);
  if (src === null) return <p className={HINT}>{labels.emptyImage}</p>;
  const caption = captionText(str(data.caption));
  return (
    <figure>
      <img src={src} alt={str(data.alt) || labels.imageNoAlt} className="max-w-full rounded-md" />
      {caption && <figcaption className={HINT}>{caption}</figcaption>}
    </figure>
  );
}

export function FilePreview({ data }: BlockPreviewProps) {
  const labels = useLabels();
  const name = str(data.filename);
  if (name === '') return <p className={HINT}>{labels.emptyFile}</p>;
  return <p className="text-sm">{name}</p>;
}

export function CalloutPreview({ data }: BlockPreviewProps) {
  const labels = useLabels();
  const body = str(data.body);
  if (body.trim() === '') return <p className={HINT}>{labels.emptyCallout}</p>;
  const tone = str(data.tone) || 'info';
  const paint = TONE[tone] ?? 'border-border bg-muted/50';
  return (
    <div data-tone={tone} className={`rounded-md border-l-4 ${paint} p-3 text-sm`}>
      {body}
    </div>
  );
}
