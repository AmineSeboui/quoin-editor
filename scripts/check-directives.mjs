import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { directiveFiles } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const dist = resolve(import.meta.dirname, '..', 'dist');
const startsWithDirective = (file) =>
  /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/.test(readFileSync(resolve(dist, file), 'utf8'));

const missing = directiveFiles(packageEntries, true).filter((file) => !startsWithDirective(file));
const unexpected = directiveFiles(packageEntries, false).filter((file) => startsWithDirective(file));
if (missing.length || unexpected.length) {
  console.error({ missing, unexpected });
  process.exit(1);
}
console.log('Client entries carry the directive and the others do not.');
