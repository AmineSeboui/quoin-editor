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

export function isPaletteColor(name: string): boolean {
  return (PALETTE as readonly string[]).includes(name);
}
