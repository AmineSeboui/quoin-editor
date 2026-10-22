import { inflateRawSync } from 'node:zlib';

export type UnzippedEntry = { readonly method: number; readonly crc: number; readonly data: Uint8Array };

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/** Reads a zip archive the way an unzip tool does, through its central directory, and checks each local header. */
export function unzip(archive: Uint8Array): Map<string, UnzippedEntry> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  let end = archive.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== END_OF_DIRECTORY) end--;
  if (end < 0) throw new Error('no end of central directory');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = new Map<string, UnzippedEntry>();
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index++) {
    if (view.getUint32(at, true) !== DIRECTORY_ENTRY) throw new Error(`bad directory entry ${index}`);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(archive.subarray(at + 46, at + 46 + nameLength));
    if (view.getUint32(local, true) !== LOCAL_HEADER) throw new Error(`bad local header for ${name}`);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const stored = archive.subarray(start, start + size);
    entries.set(name, { method, crc, data: method === 8 ? new Uint8Array(inflateRawSync(stored)) : stored });
    at += 46 + nameLength + extra + comment;
  }
  return entries;
}

export const textOf = (entries: Map<string, UnzippedEntry>, name: string): string => {
  const entry = entries.get(name);
  if (!entry) throw new Error(`${name} is not in the archive`);
  return new TextDecoder().decode(entry.data);
};
