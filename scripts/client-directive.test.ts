// @vitest-environment node
import { readFileSync } from 'node:fs';
import { SourceMap, type SourceMapPayload } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeBuilt, dist } from '../test/support/built-dist';
import { encodeMappings } from './map-segments.mjs';
import { withClientDirective } from './client-directive.mjs';

const payload = (mappings: string) => ({ version: 3, file: 'a.js', sources: ['a.ts'], sourcesContent: [], sourceRoot: '', names: [], mappings }) as SourceMapPayload;

describe('withClientDirective', () => {
  const code = 'var a=1;\nvar b=2;\n';
  const mappings = encodeMappings([[[4, 0, 10, 4]], [[4, 0, 11, 4]]]);

  it('puts the directive on a line of its own and moves every mapped line down by one', () => {
    const result = withClientDirective(code, payload(mappings));
    expect(result.code).toBe(`'use client';\n${code}`);
    const lookup = new SourceMap(result.map);
    expect(lookup.findEntry(1, 4)).toMatchObject({ originalLine: 10, originalColumn: 4 });
    expect(lookup.findEntry(2, 4)).toMatchObject({ originalLine: 11, originalColumn: 4 });
  });

  it('leaves code that carries the directive as it is', () => {
    const map = payload(mappings);
    expect(withClientDirective(`"use client";${code}`, map)).toEqual({ code: `"use client";${code}`, map });
  });
});

describeBuilt('a built client entry', ['ai.js', 'ai.js.map', 'ai.cjs', 'ai.cjs.map'], () => {
  it.each(['ai.js', 'ai.cjs'])('%s starts with the directive on its own line and maps later lines to their source', (file) => {
    const lines = readFileSync(resolve(dist, file), 'utf8').split('\n');
    expect(lines[0]).toBe("'use client';");
    const map = JSON.parse(readFileSync(resolve(dist, `${file}.map`), 'utf8')) as SourceMapPayload;
    expect(map.mappings.startsWith(';')).toBe(true);
    const line = lines.findIndex((candidate) => candidate.includes('closeStreaming(markdown'));
    const entry = new SourceMap(map).findEntry(line, lines[line].indexOf('closeStreaming'));
    if (!('originalSource' in entry)) throw new Error('no source place');
    expect(entry.originalSource).toBe('../src/extensions/ai/streaming-markdown.ts');
    const source = readFileSync(resolve(dist, entry.originalSource), 'utf8').split('\n');
    expect(source[entry.originalLine]).toContain('closeStreaming');
  });
});
