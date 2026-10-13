import type { QuoinBlock } from '../model/quoin-block';

export type Slice = {
  readonly blocks: readonly QuoinBlock[];
  readonly openStart: boolean;
  readonly openEnd: boolean;
};
