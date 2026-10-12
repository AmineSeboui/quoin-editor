import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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

const samples = join(work, 'samples');
mkdirSync(samples);
cpSync(join(root, 'consumer-check', 'consumer.tsx'), join(samples, 'consumer.tsx'));

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

// Tooling reads the manifest of a package it is given, so the exports map has to let it.
const resolver = JSON.stringify(join(work, 'resolve-probe.cjs'));
run(
  process.execPath,
  ['-e', `require('node:module').createRequire(${resolver}).resolve('quoin-editor/package.json')`],
  work,
);

// Only React 18 reports a layout effect reaching a server render, through console.error.
if (react === '18') {
  cpSync(join(root, 'consumer-check', 'server-render.mjs'), join(work, 'server-render.mjs'));
  run(process.execPath, ['server-render.mjs'], work);
}

console.log(`The packed package typechecks for a consumer on React ${react} and TypeScript 5.4, README samples included.`);
