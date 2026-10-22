import type { QuoinBlock } from 'quoin-editor';
import type { AiRequest } from 'quoin-editor/ai';
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
    /** Tells the other pages this one has gone, as a provider does when it disconnects. */
    __quoinLeave?: () => void;
    /** Lets every answer the harness's comments host is holding go. */
    __quoinAnswerComments?: () => void;
    /** The harness's AI host: what it was asked, how many streams were aborted, and the means to answer the last. */
    __quoinAi?: {
      requests: AiRequest[];
      aborted: number;
      push(chunk: string): void;
      end(): void;
      fail(message: string): void;
    };
  }
}
