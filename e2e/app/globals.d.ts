import type { QuoinBlock } from 'quoin-editor';
import type { ViewController } from 'quoin-editor/headless';

declare global {
  interface Window {
    __quoin: {
      blocks(): QuoinBlock[];
      changes: number;
      controller?: ViewController;
      files?: { names: string[]; at: unknown }[];
    };
  }
}
