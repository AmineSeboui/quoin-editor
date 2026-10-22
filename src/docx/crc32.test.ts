// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('crc32', () => {
  it.each([
    ['', 0x00000000],
    ['a', 0xe8b7be43],
    ['abc', 0x352441c2],
    ['123456789', 0xcbf43926],
    ['The quick brown fox jumps over the lazy dog', 0x414fa339],
  ])('of %j is the standard check value', (text, expected) => {
    expect(crc32(bytes(text))).toBe(expected);
  });

  it('covers every byte value', () => {
    expect(crc32(Uint8Array.from({ length: 256 }, (_, at) => at))).toBe(0x29058c73);
  });
});
