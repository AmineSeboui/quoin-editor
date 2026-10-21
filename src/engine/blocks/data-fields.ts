import { isPaletteColor } from '../markdown/palette';
import { isRecord } from '../model/is-record';
import type { BlockAttrs, EngineBlock, Inline } from '../model/types';

const ALIGNMENTS = ['left', 'center', 'right', 'justify'];

export type Align = 'left' | 'center' | 'right' | 'justify';

export function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function paletteOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && isPaletteColor(value) ? value : undefined;
}

export function alignOrUndefined(value: unknown): Align | undefined {
  return typeof value === 'string' && ALIGNMENTS.includes(value) ? (value as Align) : undefined;
}

export function extraFields(
  data: Record<string, unknown>,
  known: readonly string[],
): Record<string, unknown> | undefined {
  const entries = Object.entries(data).filter(([key]) => !known.includes(key));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function withDefined(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export function withExtra(fields: Record<string, unknown>, attrs: BlockAttrs): Record<string, unknown> {
  const { extra } = attrs;
  return { ...withDefined(fields), ...(isRecord(extra) ? extra : undefined) };
}

export function regionOf(block: EngineBlock, name: string): Inline {
  return block.regions[name] ?? [];
}
