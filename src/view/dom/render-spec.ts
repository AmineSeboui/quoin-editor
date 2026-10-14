import type { MapEntry } from './dom-map';

export type RenderSpec = {
  readonly sig: string;
  create(): Node;
  // Returns false when a node carrying the same signature can no longer be kept.
  refresh?(node: Node): boolean;
  describe(node: Node, out: MapEntry[]): void;
};
