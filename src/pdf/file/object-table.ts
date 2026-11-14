import { deflate } from '../../export/deflate';
import type { PdfObject } from './pdf-file';
import type { PdfEntries } from './pdf-syntax';

/** The objects of a file as they are written, an object referred to before it is written holding its number. */
export type ObjectTable = {
  add(object: PdfObject): number;
  reserve(): number;
  set(id: number, object: PdfObject): void;
  objects(): PdfObject[];
};

export function createObjectTable(): ObjectTable {
  const objects: (PdfObject | undefined)[] = [];
  return {
    add: (object) => objects.push(object),
    reserve: () => objects.push(undefined),
    set(id, object) {
      objects[id - 1] = object;
    },
    objects() {
      const missing = objects.findIndex((object) => object === undefined);
      if (missing >= 0) throw new Error(`object ${missing + 1} was reserved and never written`);
      return objects as PdfObject[];
    },
  };
}

/** A stream deflated where that makes it smaller and the runtime can, else stored as it is. */
export async function flateStream(dict: PdfEntries, data: Uint8Array): Promise<PdfObject> {
  const deflated = await deflate(data, 'deflate');
  return deflated && deflated.length < data.length ? { dict: { ...dict, Filter: '/FlateDecode' }, data: deflated } : { dict, data };
}
