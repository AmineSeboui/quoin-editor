import type { Editor, Extension, Pos, QuoinBlock } from '../engine';
import type { QuoinLabels } from '../i18n/labels';
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
   * Called for each whole block the writer removed, with the index it held, once `onChange` has reported the document
   * without it: through a command such as the block menu's Delete, by typing over a selected block, or by pasting over
   * selected blocks. A line that Backspace or Delete merges into its neighbour or drops when empty is not reported, nor
   * an empty line that pasted blocks replace. Restore a block by supplying `blocks` with it spliced back at that index.
   */
  onDelete?: (block: QuoinBlock, index: number) => void;
  blockTypes?: AnyBlockDefinition[];
  /**
   * Added after the core extensions when the canvas mounts. Remount it with a new `key` to change them. An extension's
   * `ui` field, an `ExtensionUI`, adds slash commands, block menu items, block renderers and overlays to the canvas.
   */
  extensions?: readonly Extension[];
  upload?: UploadFn;
  resolveAssetUrl?: (storageKey: string) => string;
  onError?: (error: Error) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** The text of an empty paragraph holding the caret, or alone in the document, in place of `labels.placeholderEmpty`. */
  placeholder?: string;
  /**
   * Every string the canvas shows or speaks, English by default. A key left out stays English. Keep the object stable,
   * hoisted or memoised: a new one each render re-renders everything that reads the canvas configuration.
   */
  labels?: Partial<QuoinLabels>;
  /**
   * The address the block menu's "Copy link to block" copies. By default the current page with `#block-<id>`, a fragment
   * the canvas follows on load and on hash changes to select the block and scroll it into view.
   */
  blockLink?: (blockId: string) => string;
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
