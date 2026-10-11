/**
 * The `data` shape each core block keeps its content under. A host that persists blocks
 * itself reads and writes these, so they are part of the public surface rather than an
 * implementation detail. `core-data.test.tsx` holds every one of them against the editor
 * that writes it and the seed it starts from.
 *
 * Every field is declared because something writes it. The optional ones are written
 * later than the block's first save: an image's `caption` when the author types one, its
 * `width` and `height` once the uploaded bytes have been measured, a file's `size` when
 * the upload reports it.
 */

/** `MARKDOWN`. The source text, not rendered HTML: Quoin stores and edits markdown. */
export type MarkdownBlockData = { markdown: string };

/** `CALLOUT`. The prose is under `body`, not `text`. */
export type CalloutBlockData = { tone: string; body: string };

/** `CODE`. `language` is a free string, written through as the author typed it. */
export type CodeBlockData = { language: string; code: string };

/** `IMAGE`. `storageKey` names the uploaded file; the host's `resolveAssetUrl` turns it into a URL. */
export type ImageBlockData = {
  storageKey: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** `FILE`. `storageKey` names the uploaded file; `filename` is what the author picked. */
export type FileBlockData = { storageKey: string; filename: string; size?: number };

/** Maps each core block's `type` string to its data shape. */
export type CoreBlockData = {
  MARKDOWN: MarkdownBlockData;
  CALLOUT: CalloutBlockData;
  CODE: CodeBlockData;
  IMAGE: ImageBlockData;
  FILE: FileBlockData;
};
