import { execFileSync } from 'node:child_process';

const errors = [];

// Each build in its own process, since yjs warns when its ES module and CommonJS builds load into one. The child that
// loads the entry reports whether it has a DOM once the entry has loaded.
const child = (id, load) =>
  `Promise.resolve(${load}(${JSON.stringify(id)})).then((m) => console.log(JSON.stringify({ ` +
  `dom: typeof window !== 'undefined' || typeof document !== 'undefined', names: Object.keys(m) })))`;
const exportsOf = (id, load) => {
  const { dom, names } = JSON.parse(execFileSync(process.execPath, ['-e', child(id, load)], { encoding: 'utf8' }));
  if (dom) errors.push(`${id} loads through ${load} with a DOM.`);
  return names.filter((name) => name !== '__esModule').sort();
};

for (const id of process.argv.slice(2)) {
  const imported = exportsOf(id, 'import');
  const required = exportsOf(id, 'require');
  if (imported.length === 0) errors.push(`${id} imports with no export.`);
  if (imported.join() !== required.join()) errors.push(`${id} imports ${imported.join(', ')} but requires ${required.join(', ')}.`);
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
