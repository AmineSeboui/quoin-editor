import type { RenderSpec } from './render-spec';

const signatures = new WeakMap<Node, string>();

function keeps(node: Node, spec: RenderSpec): boolean {
  return signatures.get(node) === spec.sig && (spec.refresh?.(node) ?? true);
}

// Children match by the longest common prefix and suffix of signatures. Nodes the renderer did not create carry no
// signature, so they never match and are removed with the rest of the changed middle.
export function reconcileChildren(parent: Node, specs: readonly RenderSpec[]): void {
  const old = Array.from(parent.childNodes);
  let head = 0;
  while (head < specs.length && head < old.length && keeps(old[head], specs[head])) head++;
  let oldEnd = old.length;
  let newEnd = specs.length;
  while (newEnd > head && oldEnd > head && keeps(old[oldEnd - 1], specs[newEnd - 1])) {
    oldEnd--;
    newEnd--;
  }
  const anchor = old[oldEnd] ?? null;
  for (let i = head; i < oldEnd; i++) parent.removeChild(old[i]);
  for (let i = head; i < newEnd; i++) {
    const node = specs[i].create();
    signatures.set(node, specs[i].sig);
    parent.insertBefore(node, anchor);
  }
}
