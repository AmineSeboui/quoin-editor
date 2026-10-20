import type { HostRegistry } from './host-registry';

export type ReadOnly = {
  current(): boolean;
  set(readOnly: boolean): void;
  subscribe(listener: () => void): () => void;
};

export function createReadOnly(registry: HostRegistry, initial: boolean): ReadOnly {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    current: () => value,
    set(readOnly) {
      const changed = readOnly !== value;
      value = readOnly;
      for (const { element } of registry.all()) element.contentEditable = readOnly ? 'false' : 'true';
      if (changed) for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
