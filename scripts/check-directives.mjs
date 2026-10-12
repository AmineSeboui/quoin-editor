import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const client = ['index.js', 'index.cjs', 'headless.js', 'headless.cjs'];
const server = ['engine.js', 'engine.cjs'];
const startsWithDirective = (file) =>
  /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/.test(readFileSync(resolve(dist, file), 'utf8'));

const missing = client.filter((file) => !startsWithDirective(file));
const unexpected = server.filter((file) => startsWithDirective(file));
if (missing.length || unexpected.length) {
  console.error({ missing, unexpected });
  process.exit(1);
}
console.log('Client entries carry the directive and the engine does not.');
