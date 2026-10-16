import type { Editor, Extension, Pos, QuoinBlock } from '../engine';
import type { AnyBlockDefinition } from '../registry';
import type { UploadFn } from '../types';
import type { ViewController } from '../view';

export type BlockCanvasProps = {
  /**
   * The document, controlled like `<input value onChange>`. An array the canvas emitted, or a copy of one, coming back
   * late is recognised as its echo, and an array structurally equal to the last one supplied is ignored. Any other
   * array replaces the document. Remount with a React `key` to force a reset.
   */
  blocks: QuoinBlock[];
  onChange: (blocks: QuoinBlock[]) => void;
  /**
   * Called for each block a command deleted whole, with the index it held, once `onChange` has reported the document
   * without it. Restore it by supplying `blocks` with the block spliced back at that index.
   */
  onDelete?: (block: QuoinBlock, index: number) => void;
  blockTypes?: AnyBlockDefinition[];
  /** Added after the core extensions when the canvas mounts. Remount it with a new `key` to change them. */
  extensions?: readonly Extension[];
  upload?: UploadFn;
  resolveAssetUrl?: (storageKey: string) => string;
  onError?: (error: Error) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export type QuoinEditorHandle = {
  readonly editor: Editor;
  readonly controller: ViewController;
  focus(target?: Pos | 'start' | 'end'): void;
  toMarkdown(options?: { comments?: boolean }): string;
};
