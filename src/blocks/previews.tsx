'use client';

import { useQuoin } from '../context';
import type { BlockPreviewProps } from '../types';
import { str } from './str';

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
  const markdown = str(data.markdown);
  if (markdown.trim() === '') return <p className={HINT}>Empty markdown block</p>;
  return <div className="whitespace-pre-wrap text-base leading-7">{markdown}</div>;
}

export function CodePreview({ data }: BlockPreviewProps) {
  const code = str(data.code);
  if (code.trim() === '') return <p className={HINT}>Empty code block</p>;
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
      <code>{code}</code>
    </pre>
  );
}

export function ImagePreview({ data }: BlockPreviewProps) {
  const { resolveAssetUrl } = useQuoin();
  const key = str(data.storageKey);
  // Guard on the key, not the resolved URL: a prefixing resolver turns an empty key into a truthy, dead address.
  if (key === '') return <p className={HINT}>No image chosen</p>;
  return <img src={resolveAssetUrl(key)} alt={str(data.alt)} className="max-w-full rounded-md" />;
}

export function FilePreview({ data }: BlockPreviewProps) {
  const name = str(data.filename);
  if (name === '') return <p className={HINT}>No file chosen</p>;
  return <p className="text-sm">{name}</p>;
}

export function CalloutPreview({ data }: BlockPreviewProps) {
  const body = str(data.body);
  if (body.trim() === '') return <p className={HINT}>Empty callout</p>;
  const tone = str(data.tone) || 'info';
  const paint = TONE[tone] ?? 'border-border bg-muted/50';
  return (
    <div data-tone={tone} className={`rounded-md border-l-4 ${paint} p-3 text-sm`}>
      {body}
    </div>
  );
}
