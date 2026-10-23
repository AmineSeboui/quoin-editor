import { isRecord } from '../model/is-record';
import type { QuoinBlock } from '../model/quoin-block';
import type { Slice } from './slice';

function isBlock(value: unknown): value is QuoinBlock {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') return false;
  if (!isRecord(value.data)) return false;
  return value.indent === undefined || (Number.isInteger(value.indent) && (value.indent as number) >= 0);
}

export function parseSliceJSON(json: string): Slice | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.quoin !== 1 || !isRecord(parsed.slice)) return null;
  const { blocks, openStart, openEnd } = parsed.slice;
  if (!Array.isArray(blocks) || blocks.length === 0 || !blocks.every(isBlock)) return null;
  if (typeof openStart !== 'boolean' || typeof openEnd !== 'boolean') return null;
  return { blocks, openStart, openEnd };
}
