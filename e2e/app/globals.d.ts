import type { QuoinBlock } from 'quoin-editor';
import type { ViewController } from 'quoin-editor/headless';

declare global {
  interface Window {
    __quoin: {
      blocks(): QuoinBlock[];
      setBlocks?: (update: (blocks: QuoinBlock[]) => QuoinBlock[]) => void;
      changes: number;
      controller?: ViewController;
      removeRemotely?: (id: string) => void;
      files?: { names: string[]; at: unknown }[];
      timings?: number[];
      sharedText?: (index: number) => string;
      opened?: unknown[];
    };
  }
}
