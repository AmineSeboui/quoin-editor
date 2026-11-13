/** The colour names a writer can pick for text and for a background, each a `--quoin-color-*` token. */
export const PALETTE = [
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const;

/** One of the names in `PALETTE`, which the labels of the colour menu are keyed by. */
export type PaletteName = (typeof PALETTE)[number];

export function isPaletteColor(name: string): boolean {
  return (PALETTE as readonly string[]).includes(name);
}
