import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const engine = join(root, 'src', 'engine');
const specifier =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
const source = /\.[cm]?[jt]sx?$/;
const testFile = /\.test\.[cm]?[jt]sx?$/;
const testHelper = /-arbitrary\.[cm]?[jt]sx?$|[\\/]test-support[\\/]/;
const testHelperPackages = new Set(['fast-check', 'vitest']);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return source.test(name) && !testFile.test(name) ? [path] : [];
  });
}

const violations = files(engine).flatMap((file) => {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(specifier)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? match[4])
    .filter((spec) => {
      if (!spec.startsWith('.')) return !(testHelper.test(file) && testHelperPackages.has(spec));
      return relative(engine, resolve(dirname(file), spec)).startsWith('..');
    })
    .map((spec) => `${relative(root, file)}: ${spec}`);
});

if (violations.length) {
  console.error('The engine must not import packages or code outside src/engine:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Engine imports are self-contained.');
