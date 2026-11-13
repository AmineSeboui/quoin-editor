import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { roundTrip } from './markdown-round-trip.mjs';
import { exitCode, roundTripReport } from './round-trip-report.mjs';

const USAGE = 'Usage: npm run convert:markdown -- <directory> [--out <directory>] [--changes]';
const MARKDOWN = /\.(?:md|markdown)$/i;

class UsageError extends Error {}

function readArguments(args) {
  const options = { input: '', out: '', changes: false };
  for (let at = 0; at < args.length; at += 1) {
    if (args[at] === '--changes') options.changes = true;
    else if (args[at] === '--out' && args[at + 1]) options.out = resolve(args[(at += 1)]);
    else if (!args[at].startsWith('--') && !options.input) options.input = resolve(args[at]);
    else throw new UsageError(`Unknown argument ${args[at]}.`);
  }
  if (!options.input || !statSync(options.input, { throwIfNoEntry: false })?.isDirectory()) {
    throw new UsageError('Give the directory of markdown files to convert.');
  }
  const within = relative(options.input, options.out);
  if (options.out && !within.startsWith('..') && !isAbsolute(within)) {
    throw new UsageError('Write the output outside the directory it converts, so a second run does not read it.');
  }
  return options;
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(path);
      return entry.isFile() && MARKDOWN.test(entry.name) ? [path] : [];
    });
}

async function loadEngine() {
  try {
    return await import('quoin-editor/engine');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    throw new UsageError('Build the package first, with npm run build, so the script can load quoin-editor/engine.');
  }
}

function writtenFile({ frontMatter, markdown }) {
  if (!frontMatter) return markdown;
  return markdown ? `${frontMatter}\n${markdown}` : frontMatter;
}

function write(out, path, result) {
  const target = join(out, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, writtenFile(result));
  writeFileSync(target.replace(MARKDOWN, '.json'), `${JSON.stringify(result.blocks, null, 2)}\n`);
}

async function main(args) {
  const options = readArguments(args);
  const engine = await loadEngine();
  const started = performance.now();
  const results = markdownFiles(options.input).map((file) => {
    const path = relative(options.input, file).split('\\').join('/');
    const begun = performance.now();
    const result = roundTrip(readFileSync(file, 'utf8'), engine);
    if (options.out && result.blocks) write(options.out, path, result);
    return { path, ...result, ms: performance.now() - begun };
  });
  const seconds = (performance.now() - started) / 1000;
  console.log(roundTripReport(results, { seconds, changes: options.changes }));
  return exitCode(results);
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof UsageError)) throw error;
  console.error(`${error.message}\n${USAGE}`);
  process.exitCode = 2;
}
