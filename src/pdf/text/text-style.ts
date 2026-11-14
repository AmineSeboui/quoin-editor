export type Rgb = readonly [number, number, number];

/** Where a link goes: an address, or the heading of the block with this id. */
export type LinkTarget = { readonly uri: string } | { readonly heading: string };

export type TextStyle = {
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly mono: boolean;
  readonly color: Rgb;
  readonly underline: boolean;
  readonly strike: boolean;
  readonly background?: Rgb;
  readonly script?: 'sub' | 'sup';
  readonly link?: LinkTarget;
};

/** An sRGB colour written as six hex digits, as a PDF colour of three components from 0 to 1. */
export function rgbOf(hex: string): Rgb {
  const channel = (at: number) => Math.round((parseInt(hex.slice(at, at + 2), 16) / 255) * 1000) / 1000;
  return [channel(0), channel(2), channel(4)];
}

export const INK = rgbOf('0A0A0A');
export const MUTED = rgbOf('595959');
export const LINK = rgbOf('0A71B1');
export const RULE = rgbOf('BFBFBF');
export const CODE_FILL = rgbOf('F0F0F0');

export const BODY_SIZE = 11;

export const BODY: TextStyle = { size: BODY_SIZE, bold: false, italic: false, mono: false, color: INK, underline: false, strike: false };

/** How much smaller a subscript or superscript is drawn than the text around it. */
export const SCRIPT_SCALE = 0.7;

export const drawnSize = (style: TextStyle): number => (style.script ? style.size * SCRIPT_SCALE : style.size);
