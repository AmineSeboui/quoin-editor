// @vitest-environment node
import { expect, it } from 'vitest';
import { decodeMappings, encodeMappings, withoutRepeatedSegments } from './map-segments.mjs';

const MAPPINGS = ';;AAAA,SAAS,qBAAqC;AAuCvC,SAAS,UAAU,EAAE;AAClG,QAAM,QAAQ,oBAAI,IAA4B;AAC9C';

it('reads and writes the mappings of a sourcemap without changing them', () => {
  expect(encodeMappings(decodeMappings(MAPPINGS))).toBe(MAPPINGS);
});

it('reads a negative and a multi-digit value', () => {
  expect(decodeMappings('AAAA,gBAAiB,DAAD;;')).toEqual([[[0, 0, 0, 0], [16, 0, 0, 17], [15, 0, 0, 16]], [], []]);
});

it('drops a segment that maps to the place the segment before it on its line maps to', () => {
  const lines = [
    [[0, 0, 4, 2], [9, 0, 4, 2], [12, 0, 4, 8], [20, 0, 4, 8, 3], [25, 0, 4, 8, 3], [30, 1, 4, 8, 3]],
    [[0, 0, 4, 2], [4]],
  ];
  expect(decodeMappings(withoutRepeatedSegments(encodeMappings(lines)))).toEqual([
    [[0, 0, 4, 2], [12, 0, 4, 8], [20, 0, 4, 8, 3], [30, 1, 4, 8, 3]],
    [[0, 0, 4, 2], [4]],
  ]);
});

it('throws on a character that is not a base64 digit, rather than reading it as a number', () => {
  expect(() => decodeMappings('AAAA,A!AA')).toThrow('"!"');
  expect(() => withoutRepeatedSegments('AA AA')).toThrow('" "');
});
