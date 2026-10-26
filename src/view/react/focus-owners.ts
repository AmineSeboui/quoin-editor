import type { ViewController } from '../controller/view-controller';

/**
 * The canvas each element that took focus belongs to, its portalled menus included, as React's tree says: the
 * innermost canvas when one is drawn inside another's tree.
 */
export const focusOwners = new WeakMap<EventTarget, ViewController>();
