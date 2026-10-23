import { execFileSync } from 'node:child_process';

const errors = [];
if (typeof window !== 'undefined' || typeof document !== 'undefined') errors.push('This process has a DOM.');

// Each build in its own process, since yjs warns when its ES module and CommonJS builds load into one.
const exportsOf = (id, load) =>
  JSON.parse(
    execFileSync(process.execPath, ['-e', `Promise.resolve(${load}(${JSON.stringify(id)})).then((m) => console.log(JSON.stringify(Object.keys(m))))`], {
      encoding: 'utf8',
    }),
  )
    .filter((name) => name !== '__esModule')
    .sort();

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
