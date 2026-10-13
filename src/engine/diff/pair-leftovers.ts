import { profileOf, similarity, type BlockProfile } from './block-similarity';
import type { Step } from './diff-steps';

const MIN_SIMILARITY = 0.5;
// A run with more candidate pairs than this is a rewrite of the document, not an edit, and is left unpaired.
const MAX_CANDIDATES = 10_000;

type Match = readonly [deleted: number, inserted: number];

// The set of pairs, in document order on both sides, with the greatest total similarity.
function bestMatches(left: readonly BlockProfile[], right: readonly BlockProfile[]): Match[] {
  const rows = left.length;
  const cols = right.length;
  if (rows === 0 || cols === 0 || rows * cols > MAX_CANDIDATES) return [];
  const width = cols + 1;
  const gain = new Float64Array(rows * cols);
  const total = new Float64Array((rows + 1) * width);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const s = similarity(left[r - 1], right[c - 1]);
      const g = s >= MIN_SIMILARITY ? s : 0;
      gain[(r - 1) * cols + c - 1] = g;
      const diagonal = g > 0 ? total[(r - 1) * width + c - 1] + g : 0;
      total[r * width + c] = Math.max(total[(r - 1) * width + c], total[r * width + c - 1], diagonal);
    }
  }
  const matches: Match[] = [];
  for (let r = rows, c = cols; r > 0 && c > 0; ) {
    const g = gain[(r - 1) * cols + c - 1];
    if (g > 0 && total[r * width + c] === total[(r - 1) * width + c - 1] + g) {
      matches.push([r - 1, c - 1]);
      r--;
      c--;
    } else if (total[r * width + c] === total[(r - 1) * width + c]) {
      r--;
    } else {
      c--;
    }
  }
  return matches.reverse();
}

function pairRun(run: readonly Step[]): Step[] {
  const deletes = run.filter((step) => step.kind === 'delete');
  const inserts = run.filter((step) => step.kind === 'insert');
  const matches = bestMatches(
    deletes.map((step) => profileOf(step.block)),
    inserts.map((step) => profileOf(step.block)),
  );
  if (matches.length === 0) return [...run];
  const paired: Step[] = [];
  let d = 0;
  let i = 0;
  for (const [deleted, inserted] of matches) {
    while (d < deleted) paired.push(deletes[d++]);
    while (i < inserted) paired.push(inserts[i++]);
    paired.push({ kind: 'pair', before: deletes[deleted].block, after: inserts[inserted].block });
    d = deleted + 1;
    i = inserted + 1;
  }
  return [...paired, ...deletes.slice(d), ...inserts.slice(i)];
}

/** Turns the deletions and insertions between two paired blocks into pairs where a deleted block resembles an inserted one. */
export function pairLeftovers(steps: readonly Step[]): Step[] {
  const result: Step[] = [];
  let run: Step[] = [];
  const flush = () => {
    result.push(...pairRun(run));
    run = [];
  };
  for (const step of steps) {
    if (step.kind === 'pair') {
      flush();
      result.push(step);
    } else {
      run.push(step);
    }
  }
  flush();
  return result;
}
