// @vitest-environment node
import { crc32 as nodeCrc32 } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zipArchive } from './zip';
import { unzip } from './test-support/unzip';

const encode = (text: string) => new TextEncoder().encode(text);
const noise = (length: number) => {
  let seed = 7;
  return Uint8Array.from({ length }, () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) >> 23);
};
const files = [
  { path: '[Content_Types].xml', data: encode('<Types/>'.repeat(200)) },
  { path: 'word/media/image1.png', data: noise(300) },
  { path: 'empty.txt', data: new Uint8Array() },
];

const read = (archive: Uint8Array) => {
  const entries = unzip(archive);
  return [...entries].map(([path, { method, crc, data }]) => ({ path, method, crc, text: [...data] }));
};

afterEach(() => vi.unstubAllGlobals());

describe('zipArchive', () => {
  it('starts with a local header and opens to the same files, in order, with their checksums', async () => {
    const archive = await zipArchive(files);
    expect([...archive.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = unzip(archive);
    expect([...entries.keys()]).toEqual(files.map(({ path }) => path));
    for (const { path, data } of files) {
      expect([...entries.get(path)!.data]).toEqual([...data]);
      expect(entries.get(path)!.crc).toBe(nodeCrc32(data));
    }
  });

  it('deflates the files that shrink when CompressionStream can, and stores the rest', async () => {
    const methods = [...unzip(await zipArchive(files)).values()].map(({ method }) => method);
    expect(methods).toEqual([8, 0, 0]);
  });

  it('stores every file where CompressionStream is missing, and still opens', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const stored = read(await zipArchive(files));
    expect(stored.map(({ method }) => method)).toEqual([0, 0, 0]);
    expect(stored.map(({ text }) => text)).toEqual(files.map(({ data }) => [...data]));
  });

  it('stores every file where CompressionStream cannot write raw deflate', async () => {
    vi.stubGlobal(
      'CompressionStream',
      class {
        constructor() {
          throw new TypeError('Unsupported compression format');
        }
      },
    );
    expect(read(await zipArchive(files)).map(({ method }) => method)).toEqual([0, 0, 0]);
  });

  it('writes the same bytes for the same files', async () => {
    expect([...(await zipArchive(files))]).toEqual([...(await zipArchive(files))]);
  });

  it('writes file names as UTF-8 and flags them so', async () => {
    const archive = await zipArchive([{ path: 'word/media/caf\u00E9.png', data: encode('x') }]);
    expect([...unzip(archive).keys()]).toEqual(['word/media/caf\u00E9.png']);
    expect(new DataView(archive.buffer).getUint16(6, true) & 0x800).toBe(0x800);
  });
});
