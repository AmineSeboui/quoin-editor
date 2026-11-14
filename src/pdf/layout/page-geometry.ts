import type { Margins, PageGeometry } from './paginate';

export type PdfPageSize = 'a4' | 'letter';

/** Margins in points, one number for all four sides or each side on its own. */
export type PdfMargin = number | { readonly top?: number; readonly right?: number; readonly bottom?: number; readonly left?: number };

const SIZES: Readonly<Record<PdfPageSize, readonly [number, number]>> = { a4: [595.28, 841.89], letter: [612, 792] };

const DEFAULT_MARGIN = 72;

// The text area keeps at least an inch each way: margins that leave less are reduced in proportion.
const LEAST_TEXT = 72;

const side = (value: number | undefined) => (value !== undefined && Number.isFinite(value) && value >= 0 ? value : DEFAULT_MARGIN);

function fitted(before: number, after: number, page: number): [number, number] {
  const room = page - LEAST_TEXT;
  return before + after <= room ? [before, after] : [(before * room) / (before + after), (after * room) / (before + after)];
}

/** The size of a page and its margins, A4 with an inch of margin on every side unless asked otherwise. */
export function pageGeometry(size: PdfPageSize | undefined, margin: PdfMargin | undefined): PageGeometry {
  const [width, height] = SIZES[size === 'letter' ? 'letter' : 'a4'];
  const sides = typeof margin === 'number' ? { top: margin, right: margin, bottom: margin, left: margin } : (margin ?? {});
  const [top, bottom] = fitted(side(sides.top), side(sides.bottom), height);
  const [left, right] = fitted(side(sides.left), side(sides.right), width);
  const margins: Margins = { top, right, bottom, left };
  return { width, height, margin: margins };
}
