import type { PALETTE } from './palette';

export type Rgb = readonly [number, number, number];
export type PaletteName = (typeof PALETTE)[number];
export type PaletteKind = 'text' | 'background';

// Each name lists the current and the earlier Notion value, which pasted content from other tools sits between.
export const PALETTE_RGB: Readonly<Record<PaletteKind, Readonly<Record<PaletteName, readonly Rgb[]>>>> = {
  text: {
    default: [[55, 53, 47]],
    gray: [[120, 119, 116], [155, 154, 151], [190, 190, 188]],
    brown: [[159, 107, 83], [100, 71, 58]],
    orange: [[217, 115, 13]],
    yellow: [[203, 145, 47], [223, 171, 1]],
    green: [[68, 131, 97], [15, 123, 108]],
    blue: [[51, 126, 169], [11, 110, 153]],
    purple: [[144, 101, 176], [105, 64, 165]],
    pink: [[193, 76, 138], [173, 26, 114]],
    red: [[212, 76, 71], [224, 62, 62]],
  },
  background: {
    default: [[255, 255, 255]],
    gray: [[241, 241, 239], [235, 236, 237]],
    brown: [[244, 238, 238], [233, 229, 227]],
    orange: [[251, 236, 221]],
    yellow: [[251, 243, 219]],
    green: [[237, 243, 236], [221, 237, 234]],
    blue: [[231, 243, 248], [221, 235, 241]],
    purple: [[244, 240, 247], [234, 228, 242]],
    pink: [[249, 238, 243], [244, 223, 235]],
    red: [[253, 235, 236], [251, 228, 228]],
  },
};
