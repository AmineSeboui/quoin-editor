import type * as Y from 'yjs';
import type { Unit } from './text-units';

export type FormatAt = {
  /** The formatting attributes in force at each unit, as Yjs reads them. */
  readonly attributes: readonly Readonly<Record<string, unknown>>[];
  /** For each unit, the format unit that set each key last before it. */
  readonly governing: readonly ReadonlyMap<string, Unit>[];
};

/** Walks the format units that `counts`, as Yjs does when it reads a text. */
export function formatAt(list: readonly Unit[], counts: (unit: Unit) => boolean): FormatAt {
  const attributes: Readonly<Record<string, unknown>>[] = [];
  const governing: ReadonlyMap<string, Unit>[] = [];
  let current: Record<string, unknown> = {};
  let setters = new Map<string, Unit>();
  for (const unit of list) {
    const format: Y.ContentFormat | null = unit.format;
    if (format !== null && counts(unit)) {
      current = { ...current };
      if (format.value === null) delete current[format.key];
      else current[format.key] = format.value;
      setters = new Map(setters).set(format.key, unit);
    }
    attributes.push(current);
    governing.push(setters);
  }
  return { attributes, governing };
}
