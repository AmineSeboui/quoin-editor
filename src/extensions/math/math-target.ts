import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../../view';
import type { AtomPlace } from '../atoms/atom-place';

/** A formula in a line, kept with the LaTeX it held when its editor opened, so a write can tell it is still there. */
export type AtomTarget = {
  readonly kind: 'atom';
  readonly block: string;
  readonly region: string;
  readonly offset: number;
  readonly latex: string;
};

export const atomTarget = ({ block, region, offset, node }: AtomPlace): AtomTarget => ({
  kind: 'atom',
  block,
  region,
  offset,
  latex: node.attrs.latex ?? '',
});

/** A math block, kept with the LaTeX it held when its editor opened. */
export type BlockTarget = { readonly kind: 'block'; readonly block: string; readonly latex: string };

/** What the math editor of a canvas is open on: a math block or a formula in a line. */
export type MathTarget = BlockTarget | AtomTarget;

type Store = { target: MathTarget | null; readonly listeners: Set<() => void> };

const stores = new WeakMap<ViewController, Store>();

function storeOf(controller: ViewController): Store {
  let store = stores.get(controller);
  if (store === undefined) {
    store = { target: null, listeners: new Set() };
    stores.set(controller, store);
  }
  return store;
}

const sameTarget = (a: MathTarget | null, b: MathTarget | null): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Opens the math editor of the canvas on `target`, or closes it. */
export function openMath(controller: ViewController, target: MathTarget | null): void {
  const store = storeOf(controller);
  if (sameTarget(store.target, target)) return;
  store.target = target;
  for (const listener of [...store.listeners]) listener();
}

export function useMathTarget(controller: ViewController): MathTarget | null {
  const subscribe = useCallback(
    (notify: () => void) => {
      const { listeners } = storeOf(controller);
      listeners.add(notify);
      return () => void listeners.delete(notify);
    },
    [controller],
  );
  const read = useCallback(() => storeOf(controller).target, [controller]);
  return useSyncExternalStore(subscribe, read, read);
}
