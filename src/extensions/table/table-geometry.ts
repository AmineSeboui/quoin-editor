import { inlineDirection, type InlineDirection } from '../../ui/direction';

export type Span = { readonly start: number; readonly size: number };

/** Where a table's rows and columns are drawn, in pixels from the top left corner of `origin`. */
export type TableGeometry = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly Span[];
  readonly cols: readonly Span[];
  /** The way the columns run: from the left, or from the right on a right to left page. */
  readonly direction: InlineDirection;
};

export function measureTable(table: HTMLTableElement, origin: DOMRect): TableGeometry {
  const box = table.getBoundingClientRect();
  const first = table.rows[0];
  return {
    left: box.left - origin.left,
    top: box.top - origin.top,
    width: box.width,
    height: box.height,
    rows: Array.from(table.rows, (row) => {
      const rect = row.getBoundingClientRect();
      return { start: rect.top - origin.top, size: rect.height };
    }),
    cols: Array.from(first?.cells ?? [], (cell) => {
      const rect = cell.getBoundingClientRect();
      return { start: rect.left - origin.left, size: rect.width };
    }),
    direction: inlineDirection(table),
  };
}

const sameSpans = (a: readonly Span[], b: readonly Span[]) =>
  a.length === b.length && a.every((span, i) => span.start === b[i].start && span.size === b[i].size);

export const sameGeometry = (a: TableGeometry | null, b: TableGeometry | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.direction === b.direction &&
    sameSpans(a.rows, b.rows) &&
    sameSpans(a.cols, b.cols));

const spanEnd = (span: Span) => span.start + span.size;

/** The edge a span starts from in the order the spans run, on its right where they run right to left. */
const leadingEdge = (span: Span, direction: InlineDirection) => (direction === 'rtl' ? spanEnd(span) : span.start);

/** The edge a span ends at in the order the spans run, on its left where they run right to left. */
export const trailingEdge = (span: Span, direction: InlineDirection) =>
  direction === 'rtl' ? span.start : spanEnd(span);

/** The index of the span that holds `at`, or of the nearest one, whichever way the spans run. */
export function spanAt(spans: readonly Span[], at: number): number {
  const inside = spans.findIndex((span) => span.start <= at && at < spanEnd(span));
  if (inside !== -1) return inside;
  const distances = spans.map((span) => Math.min(Math.abs(span.start - at), Math.abs(spanEnd(span) - at)));
  return distances.indexOf(Math.min(...distances));
}

/** The index of the edge between spans, from 0 before the first to their count after the last, within `reach` of `at`. */
export function edgeNear(
  spans: readonly Span[],
  at: number,
  reach: number,
  direction: InlineDirection = 'ltr',
): number | null {
  if (spans.length === 0) return null;
  const last = trailingEdge(spans[spans.length - 1], direction);
  const edges = [...spans.map((span) => leadingEdge(span, direction)), last];
  const index = edges.findIndex((edge) => Math.abs(edge - at) <= reach);
  return index === -1 ? null : index;
}

/** Where the edge before the span at `edge` is drawn, the edge after the last one at their count, if the table has it. */
export function edgeAt(
  spans: readonly Span[],
  edge: number | null,
  direction: InlineDirection = 'ltr',
): number | null {
  if (edge === null || !Number.isInteger(edge) || edge < 0 || edge > spans.length || spans.length === 0) return null;
  return edge === spans.length ? trailingEdge(spans[edge - 1], direction) : leadingEdge(spans[edge], direction);
}
