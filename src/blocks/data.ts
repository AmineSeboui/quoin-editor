/**
 * The `data` shape each core block keeps its content under. A host that persists blocks
 * itself reads and writes these, so they are part of the public surface rather than an
 * implementation detail. `core-data.test.tsx` holds every one of them against the editor
 * that writes it and the seed it starts from.
 *
 * Every field is declared because something writes it. The optional ones are written
 * later than the block's first save, and only once set: an image's `caption` when the
 * author types one, its `width` and `height` once the uploaded bytes have been measured,
 * its `url`, `align` and `widthPercent` when the author links, aligns or resizes it, a
 * file's `size` when the upload reports it and its `mime` when the file declares a type.
 */

/** `MARKDOWN`. The source text, not rendered HTML: Quoin stores and edits markdown. */
export type MarkdownBlockData = { markdown: string };

/** `CALLOUT`. The prose is under `body`, not `text`. */
export type CalloutBlockData = { tone: string; body: string };

/** `CODE`. `language` is a free string, written through as the author typed it. */
export type CodeBlockData = { language: string; code: string };

/**
 * `IMAGE`. `storageKey` names the uploaded file, which the host's `resolveAssetUrl` turns into a URL, unless `url`
 * links a picture instead. `caption` is inline markdown, `width` and `height` the measured size of the upload, and
 * `widthPercent` the share of the line the picture is drawn at. `decorative` is `true`, and only then present, for a
 * picture that is deliberately given no description.
 */
export type ImageBlockData = {
  storageKey: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  url?: string;
  align?: 'left' | 'center' | 'right';
  widthPercent?: number;
  decorative?: boolean;
};

/**
 * `FILE`. `storageKey` names the uploaded file, which the host's `resolveAssetUrl` turns into a URL; `filename` is the
 * name the upload kept, `size` its size in bytes and `mime` the type the file declared.
 */
export type FileBlockData = { storageKey: string; filename: string; size?: number; mime?: string };

/** Maps each core block's `type` string to its data shape. */
export type CoreBlockData = {
  MARKDOWN: MarkdownBlockData;
  CALLOUT: CalloutBlockData;
  CODE: CodeBlockData;
  IMAGE: ImageBlockData;
  FILE: FileBlockData;
};
