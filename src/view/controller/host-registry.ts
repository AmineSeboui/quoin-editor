export type HostEntry = { readonly block: string; readonly region: string; readonly element: HTMLElement };

export type HostRegistry = {
  register(block: string, region: string, element: HTMLElement): () => void;
  get(block: string, region: string): HTMLElement | undefined;
  locate(node: Node | null): HostEntry | null;
  all(): IterableIterator<HostEntry>;
};

export function hostKey(block: string, region: string): string {
  return `${block}\u0000${region}`;
}

export function createHostRegistry(onRegister?: (element: HTMLElement) => () => void): HostRegistry {
  const byKey = new Map<string, HostEntry>();
  const byElement = new Map<Node, HostEntry>();
  const releases = new Map<HostEntry, () => void>();

  function forget(entry: HostEntry): void {
    const key = hostKey(entry.block, entry.region);
    if (byKey.get(key) === entry) byKey.delete(key);
    if (byElement.get(entry.element) === entry) byElement.delete(entry.element);
    releases.get(entry)?.();
    releases.delete(entry);
  }

  return {
    register(block, region, element) {
      const key = hostKey(block, region);
      const entry: HostEntry = { block, region, element };
      for (const previous of [byKey.get(key), byElement.get(element)]) if (previous) forget(previous);
      byKey.set(key, entry);
      byElement.set(element, entry);
      if (onRegister) releases.set(entry, onRegister(element));
      return () => forget(entry);
    },
    get: (block, region) => byKey.get(hostKey(block, region))?.element,
    locate(node) {
      for (let current = node; current; current = current.parentNode) {
        const entry = byElement.get(current);
        if (entry) return entry;
      }
      return null;
    },
    all: () => byKey.values(),
  };
}
