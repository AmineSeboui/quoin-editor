import { formatSize } from './format-size';

describe('the size of a file', () => {
  it('is written in binary units, with one decimal above bytes', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(5 * 1024 ** 3)).toBe('5.0 GB');
  });

  it('stays in bytes below a kilobyte and moves up a unit where one decimal would round to 1024', () => {
    expect(formatSize(1023)).toBe('1023 B');
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1024 * 1024 - 1)).toBe('1.0 MB');
    expect(formatSize(2.25 * 1024 ** 2)).toBe('2.3 MB');
    expect(formatSize(3 * 1024 ** 4)).toBe('3.0 TB');
    expect(formatSize(2048 * 1024 ** 4)).toBe('2048.0 TB');
  });
});
