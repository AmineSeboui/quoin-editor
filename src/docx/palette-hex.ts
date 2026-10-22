import { paletteOrUndefined } from '../engine/blocks/data-fields';

// The light theme's palette tokens, written as the sRGB hex Word takes.
const TEXT: Readonly<Record<string, string>> = {
  default: '0A0A0A',
  gray: '6C6C6C',
  brown: '855F49',
  orange: 'B2580B',
  yellow: '93690D',
  green: '2A7E4F',
  blue: '0A71B1',
  purple: '8050B0',
  pink: 'B53874',
  red: 'C9302D',
};

const BACKGROUND: Readonly<Record<string, string>> = {
  default: 'FFFFFF',
  gray: 'F0F0F0',
  brown: 'F6ECE7',
  orange: 'FFEDDC',
  yellow: 'FDF4D2',
  green: 'E1F7E7',
  blue: 'E1F3FF',
  purple: 'F4ECFE',
  pink: 'FEEAF2',
  red: 'FDE9E8',
};

const pick = (table: Readonly<Record<string, string>>, name: unknown) => {
  const color = paletteOrUndefined(name);
  return color === undefined ? undefined : table[color];
};

export const textHex = (name: unknown): string | undefined => pick(TEXT, name);

export const backgroundHex = (name: unknown): string | undefined => pick(BACKGROUND, name);
