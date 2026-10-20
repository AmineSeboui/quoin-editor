import type { BlockAttrs } from '../../engine/model/types';
import type { CalloutTone } from '../../i18n/labels';

export const CALLOUT_TONES: readonly CalloutTone[] = ['info', 'tip', 'success', 'warning', 'danger'];

export const CALLOUT_ICONS = ['\u{1F4A1}', '\u26A0\uFE0F', '\u2705', '\u2757', '\u2139\uFE0F', '\u{1F4CC}'] as const;

const TONE_ICONS: Readonly<Record<CalloutTone, string>> = {
  info: '\u2139\uFE0F',
  tip: '\u{1F4A1}',
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  danger: '\u2757',
};

export function calloutTone(value: unknown): CalloutTone {
  return CALLOUT_TONES.find((tone) => tone === value) ?? 'info';
}

export function calloutIcon(attrs: BlockAttrs, tone: CalloutTone): string {
  return typeof attrs.icon === 'string' && attrs.icon !== '' ? attrs.icon : TONE_ICONS[tone];
}
