export type DiffOp<T> = { op: 'equal' | 'insert' | 'delete'; items: T[] };

type Edit<T> = { op: DiffOp<T>['op']; item: T };

const same = (x: unknown, y: unknown) => x === y;

// trace[d] holds the furthest x reached on each diagonal k in [-d - 1, d + 1] before round d, at index k + d + 1.
function traceEdits<T>(a: readonly T[], b: readonly T[], equal: (x: T, y: T) => boolean): Int32Array[] {
  const n = a.length;
  const m = b.length;
  const offset = n + m + 1;
  const furthest = new Int32Array(2 * offset + 1);
  const trace: Int32Array[] = [];
  for (let d = 0; ; d++) {
    trace.push(furthest.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && furthest[offset + k - 1] < furthest[offset + k + 1]);
      let x = down ? furthest[offset + k + 1] : furthest[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && equal(a[x], b[y])) {
        x++;
        y++;
      }
      furthest[offset + k] = x;
      if (x >= n && y >= m) return trace;
    }
  }
}

function backtrack<T>(trace: readonly Int32Array[], a: readonly T[], b: readonly T[]): Edit<T>[] {
  const edits: Edit<T>[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const at = (k: number) => trace[d][k + d + 1];
    const k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const previousK = down ? k + 1 : k - 1;
    const previousX = at(previousK);
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      edits.push({ op: 'equal', item: a[x - 1] });
      x--;
      y--;
    }
    if (d > 0) edits.push(down ? { op: 'insert', item: b[previousY] } : { op: 'delete', item: a[previousX] });
    x = previousX;
    y = previousY;
  }
  return edits.reverse();
}

// Within a run of changes the deletions come first, so a replaced word reads old then new.
function mergeEdits<T>(edits: readonly Edit<T>[]): DiffOp<T>[] {
  const ops: DiffOp<T>[] = [];
  let deleted: T[] = [];
  let inserted: T[] = [];
  const flush = () => {
    if (deleted.length > 0) ops.push({ op: 'delete', items: deleted });
    if (inserted.length > 0) ops.push({ op: 'insert', items: inserted });
    deleted = [];
    inserted = [];
  };
  for (const { op, item } of edits) {
    if (op === 'delete') {
      deleted.push(item);
    } else if (op === 'insert') {
      inserted.push(item);
    } else {
      flush();
      const last = ops[ops.length - 1];
      if (last?.op === 'equal') last.items.push(item);
      else ops.push({ op: 'equal', items: [item] });
    }
  }
  flush();
  return ops;
}

/** Items of an `equal` op come from `a`. */
export function diffSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equal: (x: T, y: T) => boolean = same,
): DiffOp<T>[] {
  return mergeEdits(backtrack(traceEdits(a, b, equal), a, b));
}
