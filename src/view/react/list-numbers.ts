import type { EngineBlock, EngineDoc } from '../../engine';
import { orderedStart } from '../../engine/markdown/ordered-start';

type Run = { readonly indent: number; next: number };

const isOrdered = (block: EngineBlock): boolean => block.type === 'MARKDOWN' && block.attrs.kind === 'ordered';

function numberDoc(doc: EngineDoc): readonly number[] {
  const numbers = doc.blocks.map(() => 1);
  const runs: Run[] = [];
  doc.blocks.forEach((block, index) => {
    while (runs.length > 0 && runs[runs.length - 1].indent > block.indent) runs.pop();
    const run = runs[runs.length - 1];
    const sameLevel = run !== undefined && run.indent === block.indent;
    if (!isOrdered(block)) {
      if (sameLevel) runs.pop();
      return;
    }
    if (sameLevel) {
      numbers[index] = run.next++;
      return;
    }
    const start = orderedStart(block.attrs.start);
    numbers[index] = start;
    runs.push({ indent: block.indent, next: start + 1 });
  });
  return numbers;
}

const cache = new WeakMap<EngineDoc, readonly number[]>();

export function orderedNumber(doc: EngineDoc, index: number): number {
  let numbers = cache.get(doc);
  if (numbers === undefined) {
    numbers = numberDoc(doc);
    cache.set(doc, numbers);
  }
  return numbers[index] ?? 1;
}
