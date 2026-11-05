import { ARGS } from './test-support/label-args';
import { PACKS } from './test-support/packs';
import { LABEL_SETS } from './test-support/label-sets';

type Leaf = [path: string, value: unknown];

const leaves = (labels: object, path = ''): Leaf[] =>
  Object.entries(labels).flatMap(([key, value]): Leaf[] => {
    const here = path === '' ? key : `${path}.${key}`;
    return typeof value === 'object' && value !== null ? leaves(value as object, here) : [[here, value]];
  });

const pathsOf = (labels: object) => leaves(labels).map(([path]) => path);

const setsOf = (pack: Record<string, unknown>, code: string) =>
  LABEL_SETS.map((set) => ({ ...set, labels: pack[`${code}${set.suffix}`] as object | undefined }));

describe.each(PACKS)('the $language locale pack', ({ code, load, shared }) => {
  it('exports one set of labels for each the editor reads, and nothing else', async () => {
    const pack = await load();
    expect(Object.keys(pack).sort()).toEqual(LABEL_SETS.map((set) => `${code}${set.suffix}`).sort());
  });

  it.each(LABEL_SETS.map((set) => set.name))('covers every %s label', async (name) => {
    const pack = await load();
    const set = setsOf(pack, code).find((candidate) => candidate.name === name);
    expect(pathsOf(set?.labels ?? {}).sort()).toEqual(pathsOf(set?.english ?? {}).sort());
  });

  it('says something for every label, and for every worded one at every count', async () => {
    const pack = await load();
    const empty: string[] = [];
    for (const { name, labels } of setsOf(pack, code)) {
      for (const [path, value] of leaves(labels ?? {})) {
        const full = `${name}.${path}`;
        if (typeof value === 'string') {
          if (value.trim() === '') empty.push(full);
          continue;
        }
        const calls = ARGS[full];
        expect(calls, `${full} is a worded label with no arguments in ARGS`).toBeDefined();
        for (const args of calls ?? []) {
          const said = (value as (...given: readonly unknown[]) => unknown)(...args);
          if (typeof said !== 'string' || said.trim() === '') empty.push(`${full}(${args.join(', ')})`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it('translates every label it does not share with English on purpose', async () => {
    const pack = await load();
    const untranslated: string[] = [];
    for (const { name, labels, english } of setsOf(pack, code)) {
      const written = new Map(leaves(english).map(([path, value]) => [path, value]));
      for (const [path, value] of leaves(labels ?? {})) {
        const full = `${name}.${path}`;
        if (typeof value === 'string' && value === written.get(path) && !shared.includes(full)) untranslated.push(full);
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('keeps nothing in the shared list that it has since translated', async () => {
    const pack = await load();
    const written = new Map(
      setsOf(pack, code).flatMap(({ name, labels, english }) => {
        const english_ = new Map(leaves(english));
        return leaves(labels ?? {}).map(([path, value]): [string, boolean] => [
          `${name}.${path}`,
          value === english_.get(path),
        ]);
      }),
    );
    expect(shared.filter((path) => written.get(path) !== true)).toEqual([]);
  });
});
