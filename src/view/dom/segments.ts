import type { AtomNode, Attrs, Decoration, Inline, Mark } from '../../engine';
import { inlineLength, nodeLength } from '../../engine/model/inline';
import { sortedEntries } from './attributes';

type WidgetDecoration = Extract<Decoration, { kind: 'widget' }>;
type DecorationRange = { readonly from: number; readonly to: number; readonly attrs: Attrs };

export type Segment =
  | { kind: 'text'; text: string; marks: readonly Mark[]; decorations: readonly Attrs[]; from: number }
  | { kind: 'atom'; node: AtomNode; decorations: readonly Attrs[]; from: number }
  | { kind: 'widget'; decoration: WidgetDecoration; from: number };

function decorationRanges(decorations: readonly Decoration[], length: number): DecorationRange[] {
  const ranges: DecorationRange[] = [];
  for (const decoration of decorations) {
    if (decoration.kind !== 'inline') continue;
    const from = Math.max(0, decoration.from);
    const to = Math.min(length, decoration.to);
    if (from < to) ranges.push({ from, to, attrs: decoration.attrs });
  }
  return ranges;
}

export function toSegments(inline: Inline, decorations: readonly Decoration[]): Segment[] {
  const length = inlineLength(inline);
  const ranges = decorationRanges(decorations, length);
  const widgets = decorations
    .filter((decoration): decoration is WidgetDecoration => decoration.kind === 'widget')
    .map((decoration) => ({ decoration, at: Math.min(Math.max(decoration.offset, 0), length) }))
    .sort((a, b) => a.at - b.at || (a.decoration.side ?? 1) - (b.decoration.side ?? 1));
  const edges = [...ranges.flatMap((range) => [range.from, range.to]), ...widgets.map((widget) => widget.at)];
  const cuts = [...new Set(edges)].filter((point) => point > 0 && point < length).sort((a, b) => a - b);
  const covering = (from: number, to: number): Attrs[] =>
    ranges.filter((range) => range.from <= from && range.to >= to).map((range) => range.attrs);

  const segments: Segment[] = [];
  let nextWidget = 0;
  let nextCut = 0;
  const placeWidgets = (upTo: number): void => {
    for (; nextWidget < widgets.length && widgets[nextWidget].at <= upTo; nextWidget++) {
      segments.push({ kind: 'widget', decoration: widgets[nextWidget].decoration, from: widgets[nextWidget].at });
    }
  };

  let start = 0;
  for (const node of inline) {
    const end = start + nodeLength(node);
    if (node.kind === 'atom') {
      placeWidgets(start);
      segments.push({ kind: 'atom', node, decorations: covering(start, end), from: start });
    } else if (end > start) {
      let from = start;
      while (from < end) {
        while (nextCut < cuts.length && cuts[nextCut] <= from) nextCut++;
        const to = nextCut < cuts.length && cuts[nextCut] < end ? cuts[nextCut] : end;
        placeWidgets(from);
        segments.push({
          kind: 'text',
          text: node.text.slice(from - start, to - start),
          marks: node.marks,
          decorations: covering(from, to),
          from,
        });
        from = to;
      }
    }
    start = end;
  }
  placeWidgets(length);
  return segments;
}

const marksKey = (marks: readonly Mark[]) => marks.map((mark) => [mark.type, sortedEntries(mark.attrs)]);
const decorationsKey = (decorations: readonly Attrs[]) => decorations.map(sortedEntries);

export function segmentSignature(segment: Segment): string {
  switch (segment.kind) {
    case 'text':
      return JSON.stringify(['text', marksKey(segment.marks), decorationsKey(segment.decorations)]);
    case 'atom': {
      const { node } = segment;
      const attrs = sortedEntries(node.attrs);
      return JSON.stringify(['atom', node.type, attrs, marksKey(node.marks), decorationsKey(segment.decorations)]);
    }
    case 'widget': {
      const { decoration } = segment;
      return JSON.stringify(['widget', decoration.widget, decoration.key, sortedEntries(decoration.attrs)]);
    }
  }
}
