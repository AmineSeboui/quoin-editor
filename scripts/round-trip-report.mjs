/**
 * @typedef {import('./markdown-round-trip.mjs').Difference} Difference
 * @typedef {import('./markdown-round-trip.mjs').Redrawn} Redrawn
 * @typedef {{
 *   path: string;
 *   status: 'unchanged' | 'changed' | 'failed';
 *   frontMatter: string | null;
 *   ms: number;
 *   difference?: Difference;
 *   redrawn?: Redrawn;
 *   error?: string;
 * }} FileResult
 */

const count = (n) => n.toLocaleString('en-US');

/** @param {FileResult} result */
function changedLines({ difference }) {
  if (!difference) return [];
  const { line, source, written } = difference;
  const shown = (text) => text ?? '(nothing, the file ends)';
  return [`    line ${line} read:    ${shown(source)}`, `    line ${line} written: ${shown(written)}`];
}

/** @param {FileResult} result */
function failedLines({ redrawn }) {
  if (!redrawn) return [];
  const shown = (text) => text ?? '(no block)';
  return [`    block ${redrawn.block} converted: ${shown(redrawn.converted)}`, `    block ${redrawn.block} read back: ${shown(redrawn.readBack)}`];
}

/** @param {readonly FileResult[]} results */
function summary(results, seconds) {
  const of = (status) => count(results.filter((result) => result.status === status).length);
  const slowest = results.reduce((a, b) => (b.ms > a.ms ? b : a));
  const fronted = results.filter((result) => result.frontMatter !== null).length;
  return [
    `Converted ${count(results.length)} markdown files in ${seconds.toFixed(1)} s.`,
    `  ${of('unchanged')} unchanged: written back exactly as read`,
    `  ${of('changed')} changed: written back differently, and reading that back gives the same document`,
    `  ${of('failed')} failed: the conversion threw, or what it wrote reads back to a different document`,
    ...(fronted > 0 ? [`  ${count(fronted)} had front matter, set aside before converting and put back on top`] : []),
    `Slowest: ${slowest.path}, ${Math.round(slowest.ms)} ms`,
  ];
}

/**
 * @param {readonly FileResult[]} results
 * @param {(result: FileResult) => string} heading
 * @param {(result: FileResult) => string[]} details
 */
function section(title, results, heading, details) {
  if (results.length === 0) return [];
  return ['', title, ...results.flatMap((result) => [heading(result), ...details(result)])];
}

/**
 * What a run found, as the lines it prints: the counts, then each failed file, then each changed file when asked.
 * @param {readonly FileResult[]} results
 * @param {{ seconds: number; changes?: boolean }} options
 */
export function roundTripReport(results, { seconds, changes = false }) {
  if (results.length === 0) return 'Found no markdown files (.md or .markdown).';
  const failed = results.filter((result) => result.status === 'failed');
  const changed = changes ? results.filter((result) => result.status === 'changed') : [];
  return [
    ...summary(results, seconds),
    ...section('Failed:', failed, (result) => `  ${result.path}: ${result.error}`, failedLines),
    ...section('Changed:', changed, (result) => `  ${result.path}`, changedLines),
  ].join('\n');
}

/** @param {readonly FileResult[]} results */
export const exitCode = (results) => (results.some((result) => result.status === 'failed') ? 1 : 0);
