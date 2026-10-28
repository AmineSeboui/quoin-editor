// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { SourceMap, type SourceMapPayload } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt, dist } from '../test/support/built-dist';
import { withoutRepeatedSegments } from './map-segments.mjs';

const maps = () => readdirSync(dist).filter((file) => file.endsWith('.map'));
const readMap = (file: string): SourceMapPayload => JSON.parse(readFileSync(resolve(dist, file), 'utf8'));

// Where a dist file's first occurrence of `text` maps to, as the source path and the text of that source line.
function origin(file: string, text: string) {
  const lines = readFileSync(resolve(dist, file), 'utf8').split('\n');
  const line = lines.findIndex((candidate) => candidate.includes(text));
  const entry = new SourceMap(readMap(`${file}.map`)).findEntry(line, lines[line].indexOf(text));
  if (!('originalSource' in entry)) return { source: '', line: undefined };
  const source = resolve(dist, entry.originalSource);
  return { source, line: existsSync(source) ? readFileSync(source, 'utf8').split('\n')[entry.originalLine] : undefined };
}

describeBuilt('the built sourcemaps', ['view.js.map', 'view.cjs.map'], () => {
  it('leave out the source text', () => {
    expect(maps().length).toBeGreaterThan(0);
    expect(maps().filter((file) => 'sourcesContent' in readMap(file))).toEqual([]);
  });

  it('name their sources relative to the map, never by a path of the machine that built them', () => {
    expect(maps().filter((file) => readMap(file).sources.some((source) => isAbsolute(source)))).toEqual([]);
  });

  it('hold no segment that maps to the place the one before it on its line maps to', () => {
    expect(maps().filter((file) => withoutRepeatedSegments(readMap(file).mappings) !== readMap(file).mappings)).toEqual([]);
  });

  it.each(['view.js', 'view.cjs'])('map a line of %s back to the line of src that wrote it', (file) => {
    const { source, line } = origin(file, '"quoin-view"');
    expect(source).toBe(resolve(dist, '..', 'src', 'view-static', 'QuoinView.tsx'));
    expect(line).toContain("'quoin-view'");
  });
});
