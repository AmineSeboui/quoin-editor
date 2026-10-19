import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { packageExports } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const path = resolve(import.meta.dirname, '..', 'package.json');
const manifest = JSON.parse(readFileSync(path, 'utf8'));
manifest.exports = packageExports(packageEntries);
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('package.json exports every entry of scripts/package-entries.mjs.');
