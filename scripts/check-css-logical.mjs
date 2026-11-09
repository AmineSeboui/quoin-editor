import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { root } from './docs-sources.mjs';

/**
 * The canvas is laid out in logical properties, so a document that runs right to left is drawn the right way round
 * without a second stylesheet. A physical inline property undoes that silently: it looks right on the page it was
 * written for and wrong on the other one, and nothing fails.
 *
 * Some are deliberate, since a few things are physical whatever the page does. One of those carries its reason on the
 * line above it, as `physical: <why>`, which is what keeps an exception from being added without one.
 */
const PHYSICAL =
  /^\s*(?:(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)\b|(?:left|right)\s*:|border-(?:top|bottom)-(?:left|right)-radius\b|(?:text-align|float|clear)\s*:\s*(?:left|right)\b)/;

const REASON = /physical:\s*\S/;

const cssFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });

const offenders = [];
const spent = [];

for (const path of cssFiles(join(root, 'src'))) {
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const excused = REASON.test(lines[index - 1] ?? '') || REASON.test(line);
    if (!PHYSICAL.test(line)) {
      if (excused && !REASON.test(line)) spent.push({ where: `${relative(root, path)}:${index + 1}`, line });
      return;
    }
    if (!excused) offenders.push({ where: `${relative(root, path)}:${index + 1}`, line: line.trim() });
  });
}

if (offenders.length > 0) {
  console.error(`${offenders.length} physical inline propert${offenders.length === 1 ? 'y' : 'ies'} in the stylesheets:`);
  for (const { where, line } of offenders) console.error(`  ${where}  ${line}`);
  console.error('\nUse the logical property instead: inset-inline-start, margin-inline-end, text-align: start, and so on.');
  console.error('If it really is physical whatever the page does, say why on the line above it: /* physical: ... */');
  process.exit(1);
}

if (spent.length > 0) {
  console.error(`${spent.length} reason${spent.length === 1 ? '' : 's'} given for a property that is not physical:`);
  for (const { where, line } of spent) console.error(`  ${where}  ${line.trim()}`);
  console.error('\nRemove the comment, so the ones that remain all mean something.');
  process.exit(1);
}

console.log('the stylesheets hold no physical inline property without a reason.');
