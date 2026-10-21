const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** A size in bytes in binary units, with one decimal above bytes: `0 B`, `1.5 KB`, `5.0 GB`. */
export function formatSize(bytes: number): string {
  let size = bytes;
  let unit = 0;
  // A size that one decimal would round up to 1024 reads as one of the next unit.
  while (size >= 1023.95 && unit < UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? size : size.toFixed(1)} ${UNITS[unit]}`;
}
