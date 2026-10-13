type Segmenter = { segment(input: string): Iterable<{ index: number; segment: string; isWordLike?: boolean }> };

const IntlWithSegmenter = Intl as unknown as {
  Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' | 'word' }) => Segmenter;
};

const graphemeSegmenter = IntlWithSegmenter.Segmenter
  ? new IntlWithSegmenter.Segmenter(undefined, { granularity: 'grapheme' })
  : null;
const wordSegmenter = IntlWithSegmenter.Segmenter
  ? new IntlWithSegmenter.Segmenter(undefined, { granularity: 'word' })
  : null;

const WORD = /[\p{L}\p{N}_]+/gu;

type Span = { start: number; end: number };

function boundaries(text: string): number[] {
  if (!graphemeSegmenter) {
    const result: number[] = [];
    let i = 0;
    for (const ch of text) {
      result.push(i);
      i += ch.length;
    }
    return [...result, text.length];
  }
  return [...[...graphemeSegmenter.segment(text)].map((s) => s.index), text.length];
}

function words(text: string): Span[] {
  if (!wordSegmenter) {
    return [...text.matchAll(WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
  }
  return [...wordSegmenter.segment(text)]
    .filter((s) => s.isWordLike)
    .map((s) => ({ start: s.index, end: s.index + s.segment.length }));
}

export function graphemeCount(text: string): number {
  return boundaries(text).length - 1;
}

export function wordCount(text: string): number {
  return words(text).length;
}

export function nextGraphemeOffset(text: string, offset: number): number {
  return boundaries(text).find((b) => b > offset) ?? text.length;
}

export function prevGraphemeOffset(text: string, offset: number): number {
  return boundaries(text).reverse().find((b) => b < offset) ?? 0;
}

export function nextWordOffset(text: string, offset: number): number {
  return words(text).find((w) => w.end > offset)?.end ?? text.length;
}

export function prevWordOffset(text: string, offset: number): number {
  return words(text).reverse().find((w) => w.start < offset)?.start ?? 0;
}
