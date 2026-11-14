import { calloutTone, type CalloutTone } from '../engine/blocks/callout-tones';
import type { PaletteName } from '../engine/markdown/palette';
import { backgroundHex } from './palette-hex';

const TONE_COLORS: Readonly<Record<CalloutTone, PaletteName>> = {
  info: 'blue',
  tip: 'purple',
  success: 'green',
  warning: 'yellow',
  danger: 'red',
};

/** The sRGB hex a callout is shaded with: the background of its tone's palette colour. */
export const calloutFill = (tone: unknown): string => backgroundHex(TONE_COLORS[calloutTone(tone)])!;
