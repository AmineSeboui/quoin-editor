import type { ViewController } from '../../view';

type AltListener = (blockId: string) => void;

const listeners = new WeakMap<ViewController, AltListener>();

/** Lets the image toolbar of a canvas open its alt text popover when something else asks for it. */
export function listenForAltRequests(controller: ViewController, listener: AltListener): () => void {
  listeners.set(controller, listener);
  return () => {
    if (listeners.get(controller) === listener) listeners.delete(controller);
  };
}

/** Opens the alt text popover of an image from the toolbar of its canvas, which hands focus back to it on close. */
export function requestAlt(controller: ViewController, blockId: string): void {
  listeners.get(controller)?.(blockId);
}
