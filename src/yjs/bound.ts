import type { Binding } from './binding';
import type { Shared } from './shared';

// Kept on the collaboration under a registered symbol, not in a module of its own, so the presence entry finds it even
// where a bundle holds two copies of this module (each CommonJS entry carries its own).
const BOUND = Symbol.for('quoin-editor.yjs.binding');

type Bound = { [BOUND]?: () => Binding | null };

export function holdBinding(collaboration: object, binding: () => Binding | null): void {
  (collaboration as Bound)[BOUND] = binding;
}

/** Where the blocks of `editor` sit in the shared text, or null while that editor is not the one connected. */
export function sharedOf(collaboration: object, editor: object): Shared | null {
  const binding = (collaboration as Bound)[BOUND]?.();
  return binding?.editor === editor ? binding.shared : null;
}
