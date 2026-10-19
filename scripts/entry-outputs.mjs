import { MAIN_ENTRY } from './package-entries.mjs';

const PACKAGE = 'quoin-editor';

const subpath = ({ name }) => (name === MAIN_ENTRY ? '.' : `./${name}`);

export const specifier = ({ name }) => (name === MAIN_ENTRY ? PACKAGE : `${PACKAGE}/${name}`);

export const tsupEntries = (entries) => Object.fromEntries(entries.map(({ name, source }) => [name, source]));

export const directiveFiles = (entries, client) =>
  entries.filter((entry) => entry.client === client).flatMap(({ name }) => [`${name}.js`, `${name}.cjs`]);

const conditions = ({ name }) => ({
  import: { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` },
  require: { types: `./dist/${name}.d.cts`, default: `./dist/${name}.cjs` },
});

export const packageExports = (entries) => ({
  ...Object.fromEntries(entries.map((entry) => [subpath(entry), conditions(entry)])),
  './styles.css': './dist/styles.css',
  './package.json': './package.json',
});
