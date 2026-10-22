import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { specifier } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const react = process.env.QUOIN_REACT ?? '19';
if (react !== '18' && react !== '19') throw new Error(`QUOIN_REACT must be 18 or 19, not ${react}.`);

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'quoin-consumer-'));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

run('npm', ['pack', '--pack-destination', work], root);
const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'));

writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'quoin-consumer', private: true, type: 'module' }));
run(
  'npm',
  [
    'install', '--no-audit', '--no-fund', `./${tarball}`,
    `react@${react}`, `react-dom@${react}`, `@types/react@${react}`, `@types/react-dom@${react}`, 'lucide-react@^1',
    'typescript@5.4',
  ],
  work,
);
// yjs is an optional peer, so the package installs without it; the yjs entry and its README sample then need it. Its
// lib0 is held at the last release whose declarations TypeScript 5.4 reads: later ones write Uint8Array<ArrayBuffer>,
// which needs TypeScript 5.7.
run('npm', ['install', '--no-audit', '--no-fund', 'yjs@13.6.33', 'lib0@0.2.111'], work);

const samples = join(work, 'samples');
mkdirSync(samples);
cpSync(join(root, 'consumer-check', 'consumer.tsx'), join(samples, 'consumer.tsx'));
writeFileSync(
  join(samples, 'entries.ts'),
  packageEntries.map((entry, i) => `export * as entry${i} from '${specifier(entry)}';\n`).join(''),
);

// The README is the package's front door, so its samples are typechecked against the packed build too.
const readme = readFileSync(join(root, 'README.md'), 'utf8');
[...readme.matchAll(/```(tsx?)\n([\s\S]*?)```/g)].forEach(([, lang, code], i) => {
  writeFileSync(join(samples, `readme-${i + 1}.${lang}`), code);
});

writeFileSync(
  join(work, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'bundler',
      jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: false, isolatedModules: true, types: [],
    },
    include: ['samples'],
  }),
);
run(join(work, 'node_modules', '.bin', 'tsc'), ['-p', '.'], work);

// Every entry resolves, and so does the manifest, which tooling reads from a package it is given.
const resolver = JSON.stringify(join(work, 'resolve-probe.cjs'));
const probes = JSON.stringify(['quoin-editor/package.json', ...packageEntries.map(specifier)]);
const probe = `const probe = require('node:module').createRequire(${resolver}); ${probes}.forEach((id) => probe.resolve(id));`;
run(process.execPath, ['-e', probe], work);

// The view entry renders in a plain Node process, with no DOM, on either React.
cpSync(join(root, 'consumer-check', 'server-view.mjs'), join(work, 'server-view.mjs'));
run(process.execPath, ['server-view.mjs'], work);

// Only React 18 reports a layout effect reaching a server render, through console.error.
if (react === '18') {
  cpSync(join(root, 'consumer-check', 'server-render.mjs'), join(work, 'server-render.mjs'));
  run(process.execPath, ['server-render.mjs'], work);
}

console.log(`The packed package typechecks for a consumer on React ${react} and TypeScript 5.4, with every entry and README sample.`);
