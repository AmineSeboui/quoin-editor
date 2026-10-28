import { readFile, readdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { withoutRepeatedSegments } from './map-segments.mjs';

/**
 * A sourcemap without the source text or a segment that repeats the place of the one before it, whose sources are
 * named relative to the map: it still maps each line to its file and line, and holds no path of the machine that built
 * it.
 */
export function portableMap(map, mapDir) {
  const { sourcesContent: _text, ...rest } = map;
  return {
    ...rest,
    mappings: withoutRepeatedSegments(map.mappings),
    sources: map.sources.map((source) => (isAbsolute(source) ? relative(mapDir, source) : source)),
  };
}

export async function makeMapsPortable(dir) {
  const maps = (await readdir(dir)).filter((file) => file.endsWith('.map'));
  await Promise.all(
    maps.map(async (file) => {
      const path = join(dir, file);
      const map = JSON.parse(await readFile(path, 'utf8'));
      await writeFile(path, JSON.stringify(portableMap(map, dir)));
    }),
  );
}
