import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SOURCE_MAPPING = /\n?\/\/# sourceMappingURL=[^\n]*\n?$/;
const ATTEMPTS = 5;
const SETTLE_MS = 400;

const settle = () => new Promise((done) => setTimeout(done, SETTLE_MS));

const cjsFiles = async (dist) => (await readdir(dist)).filter((name) => name.endsWith('.cjs'));

async function stripOnce(dist, names) {
  let stripped = 0;
  for (const name of names) {
    const path = join(dist, name);
    const code = await readFile(path, 'utf8');
    const without = code.replace(SOURCE_MAPPING, '\n');
    if (without === code) continue;
    await writeFile(path, without);
    stripped += 1;
  }
  return stripped;
}

const stillPointing = async (dist, names) => {
  const checked = await Promise.all(
    names.map(async (name) => ((await readFile(join(dist, name), 'utf8')).includes('sourceMappingURL') ? name : null)),
  );
  return checked.filter((name) => name !== null);
};

/**
 * Drops the sourcemaps of the CommonJS build and the comment pointing at them. The ESM build keeps its maps: it is
 * what a browser, a bundler and a reader step through. Shipping both sets put the tarball over the 5 MB it states.
 *
 * It runs after tsup rather than inside it, because the Rollup pass tsup's `treeshake` adds reads the maps esbuild
 * wrote and fails without them. tsup also writes the CommonJS files again after it has returned, so the comment is
 * taken out and the result read back until it stays out, rather than once and hopefully.
 */
export async function dropCjsMaps(dist) {
  const maps = (await readdir(dist)).filter((name) => name.endsWith('.cjs.map'));
  await Promise.all(maps.map((name) => rm(join(dist, name), { force: true })));

  const names = await cjsFiles(dist);
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    await stripOnce(dist, names);
    const left = await stillPointing(dist, names);
    if (left.length === 0) return { files: names.length, attempts: attempt };
    await settle();
  }
  const left = await stillPointing(dist, names);
  throw new Error(`dist: ${left.length} CommonJS files still point at a sourcemap that is not shipped: ${left.join(', ')}`);
}

const dist = resolve(import.meta.dirname, '..', 'dist');
const { files, attempts } = await dropCjsMaps(dist);
console.log(`dist: the CommonJS build ships no sourcemaps; ${files} files carry no reference (after ${attempts}).`);
