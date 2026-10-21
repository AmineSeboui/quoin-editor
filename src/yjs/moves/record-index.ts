import { idAt, idKey, idsOf, indexInRuns, type Id } from './ids';
import type { KnownRecord } from './record';

export type Copy = { readonly record: KnownRecord; readonly copy: Id };
export type Rehome = { readonly against: string; readonly copy: Id };

/** Every move record a client knows, found by the text it copied from and by the characters it copied. */
export class RecordIndex {
  private readonly bySource = new Map<string, KnownRecord[]>();
  private readonly byClient = new Map<number, KnownRecord[]>();
  private readonly byCopyClient = new Map<number, KnownRecord[]>();
  private readonly keys = new Set<string>();
  private readonly learnt = new Map<string, number>();
  private readonly rehomes = new Map<string, Rehome>();
  private readonly trimmed = new Set<string>();

  constructor(readonly me: number) {}

  /** Adds a record, learnt when this client's next clock was `clock`: what it writes from then on comes after it. */
  add(record: KnownRecord, clock = Number(record.key.split(':')[1])): void {
    if (this.keys.has(record.key)) return;
    this.keys.add(record.key);
    this.learnt.set(record.key, record.writer === this.me ? Number(record.key.split(':')[1]) : clock);
    if (record.writer === this.me && record.kind === 'map') this.ownMap(record);
    const source = idKey(record.source);
    this.bySource.set(source, [...(this.bySource.get(source) ?? []), record]);
    for (const client of new Set(record.from.map(([c]) => c))) {
      this.byClient.set(client, [...(this.byClient.get(client) ?? []), record]);
    }
    for (const client of new Set(record.to.map(([c]) => c))) {
      this.byCopyClient.set(client, [...(this.byCopyClient.get(client) ?? []), record]);
    }
  }

  private ownMap(record: KnownRecord): void {
    const copies = [...idsOf(record.to)];
    [...idsOf(record.from)].forEach((id, i) => {
      if (record.against === undefined) this.trimmed.add(idKey(id));
      else this.rehomes.set(idKey(id), { against: record.against, copy: copies[i] });
    });
  }

  /** This client's clock when it learnt `record`, so its characters from that clock on were written knowing it. */
  learntAt(record: KnownRecord): number {
    return this.learnt.get(record.key) ?? 0;
  }

  /** Where this client last re-homed its character `id`, and against which record. */
  rehomeOf(id: Id): Rehome | undefined {
    return this.rehomes.get(idKey(id));
  }

  /** Whether this client replaced its copy `id` because another record holds that character. */
  isTrimmed(id: Id): boolean {
    return this.trimmed.has(idKey(id));
  }

  /** The records whose copies include `id`. */
  madeBy(id: Id): KnownRecord[] {
    return (this.byCopyClient.get(id[0]) ?? []).filter((record) => indexInRuns(record.to, id) >= 0);
  }

  /** Whether `id` is, or copies through splits, joins and re-homing, a copy this client replaced. */
  standsForTrimmed(id: Id, visited = new Set<string>()): boolean {
    const key = idKey(id);
    if (this.trimmed.has(key)) return true;
    if (visited.has(key)) return false;
    visited.add(key);
    for (const record of this.byCopyClient.get(id[0]) ?? []) {
      if ((record.kind === 'map' && record.against === undefined) || record.all === true) continue;
      const at = indexInRuns(record.to, id);
      if (at >= 0 && this.standsForTrimmed(idAt(record.from, at), visited)) return true;
    }
    return false;
  }

  over(text: Id): readonly KnownRecord[] {
    return this.bySource.get(idKey(text)) ?? [];
  }

  /** The copies made of the character `id`, in the order their records were learnt. */
  copiesOf(id: Id): Copy[] {
    const copies: Copy[] = [];
    for (const record of this.byClient.get(id[0]) ?? []) {
      const at = indexInRuns(record.from, id);
      if (at >= 0) copies.push({ record, copy: idAt(record.to, at) });
    }
    return copies;
  }
}
