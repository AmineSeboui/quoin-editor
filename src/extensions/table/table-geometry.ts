export type Span = { readonly start: number; readonly size: number };

/** Where a table's rows and columns are drawn, in pixels from the top left corner of `origin`. */
export type TableGeometry = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly Span[];
  readonly cols: readonly Span[];
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
    sameSpans(a.rows, b.rows) &&
    sameSpans(a.cols, b.cols));

/** The index of the span that holds `at`, or of the nearest one. */
export function spanAt(spans: readonly Span[], at: number): number {
  const inside = spans.findIndex((span) => at < span.start + span.size);
  return inside === -1 ? spans.length - 1 : inside;
}

/** The index of the edge between spans, from 0 before the first to their count after the last, within `reach` of `at`. */
export function edgeNear(spans: readonly Span[], at: number, reach: number): number | null {
  if (spans.length === 0) return null;
  const edges = [spans[0].start, ...spans.map((span) => span.start + span.size)];
  const index = edges.findIndex((edge) => Math.abs(edge - at) <= reach);
  return index === -1 ? null : index;
}
