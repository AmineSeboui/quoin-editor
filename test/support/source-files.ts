import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(__dirname, '..', '..', 'src');

/**
 * The text of every .ts and .tsx file under `src`, by absolute path. Read from disk rather than imported with `?raw`:
 * a `?raw` module shares its file path with the real one, and coverage can remap the real module through it.
 */
export const sourceFiles = (): Record<string, string> =>
  Object.fromEntries(
    readdirSync(src, { recursive: true, encoding: 'utf8' })
      .filter((path) => /\.tsx?$/.test(path))
      .map((path) => [join(src, path), readFileSync(join(src, path), 'utf8')]),
  );
