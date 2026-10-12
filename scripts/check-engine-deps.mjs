import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const engine = join(root, 'src', 'engine');
const specifier =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const violations = files(engine).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(specifier)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((spec) => {
      if (!spec.startsWith('.')) return true;
      return relative(engine, resolve(dirname(file), spec)).startsWith('..');
    })
    .map((spec) => `${relative(root, file)}: ${spec}`);
});

if (violations.length) {
  console.error('The engine must not import packages or code outside src/engine:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Engine imports are self-contained.');
