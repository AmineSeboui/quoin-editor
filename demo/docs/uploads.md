---
title: Uploads
description: Quoin never makes a request: hand it an upload function and an asset resolver, and its image and file blocks call them.
---

# Uploads

Quoin never performs a request. You hand it an `upload` function, and the image and file blocks call it with the chosen `File` and a `category` that names what the file is for (the core blocks use `'image'` and `'file'`). It resolves with an `UploadResult`.

```tsx
import { BlockCanvas, type QuoinBlock, type UploadFn } from 'quoin-editor';
import 'quoin-editor/styles.css';

const upload: UploadFn = async (file, category) => {
  let response: Response;
  try {
    response = await fetch(`/api/uploads?category=${encodeURIComponent(category)}`, {
      method: 'POST',
      body: file,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new Error(response.status === 413 ? 'That file is too large.' : 'The upload was refused.');
  }
  const stored = (await response.json()) as { key: string };
  return { storageKey: stored.key, filename: file.name, size: file.size };
};

const resolveAssetUrl = (storageKey: string) => `/api/files/${encodeURIComponent(storageKey)}`;
const reportError = (error: Error) => console.error(error);

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return (
    <BlockCanvas
      blocks={blocks}
      onChange={onChange}
      upload={upload}
      resolveAssetUrl={resolveAssetUrl}
      onError={reportError}
    />
  );
}
```

- `UploadResult` is `{ storageKey, filename, size, assetId? }`. `storageKey` is an opaque key your storage can find the file by. It is what Quoin stores in the document.
- `resolveAssetUrl` turns a `storageKey` into the address a picture or a file is drawn from. On the canvas it defaults to the key itself. The image and file blocks, `toHTML`, `QuoinView` and `QuoinDiff` use an address only when it is http, https, blob, data or relative, and draw the picture as missing, or the file with no link, otherwise. `toMarkdown` writes the address your resolver returns as given, with no such check, and `toPlainText` writes no address for a picture or a file, only its alt text or its name.
- An `upload` that resolves to anything without a string `storageKey` has failed. The image or file block shows "Upload failed." and writes nothing. A file dropped or pasted on the canvas is left out, and `onError` receives an `Error` with that same message.
- **Reject with an `Error` whose `message` is safe to show.** It is rendered verbatim beside the upload button. A rejection that is not an `Error`, or an `Error` with an empty message, shows a generic "Upload failed." instead.
- **Catch network failures and rethrow with your own wording.** A raw `fetch` rejection such as "Failed to fetch" would otherwise be shown to the user verbatim.
- The upload control is disabled while an upload is in flight.
- With no `upload` function, upload fields render disabled, with a note that uploads are not configured.
- `onError` receives errors Quoin cannot show inline, such as a dropped file that failed to upload. It defaults to `console.error`.

The [image and file blocks](https://amineseboui.github.io/quoin-editor/docs/blocks/) say what they write once an upload resolves, and [Custom blocks](https://amineseboui.github.io/quoin-editor/docs/custom-blocks/#reaching-uploads-from-a-custom-block) shows the same `upload` reached from a block of your own.
