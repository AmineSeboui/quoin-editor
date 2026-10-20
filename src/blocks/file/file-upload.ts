import type { UploadResult } from '../../types';
import { uploadInto, writeAttrs, type BlockUploader } from '../upload/block-upload';

/** What a file block keeps of an upload: the key, name and size the host stored, and the type the file declares. */
export const fileAttrs = (file: File, { storageKey, filename, size }: UploadResult) => ({
  storageKey,
  filename,
  size,
  mime: file.type || undefined,
});

/** Uploads a file into a file block, written as one step in place of the file it held. */
export const uploadFile: BlockUploader = (controller, blockId, file, host) =>
  uploadInto(controller, blockId, file, { type: 'FILE', category: 'file' }, host, (stored) =>
    writeAttrs(controller, blockId, fileAttrs(file, stored), true),
  );
