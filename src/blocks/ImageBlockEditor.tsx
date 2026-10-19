'use client';

import { useEffect, useRef } from 'react';
import { useQuoin } from '../context';
import { Input } from '../ui/input';
import { UploadField } from '../upload/UploadField';
import type { BlockEditorProps, UploadResult } from '../types';
import { captionMarkdown, captionText } from './caption-markdown';
import { str } from './str';
import { intrinsicSize } from './intrinsic-size';

export function ImageBlockEditor({ data, onChange }: BlockEditorProps) {
  const { resolveAssetUrl } = useQuoin();
  // Read through a ref: measuring the upload is async, and the alt/caption fields
  // stay editable while it runs.
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  });
  const set = (patch: Record<string, unknown>) => onChange({ ...latest.current, ...patch });

  const newestKey = useRef('');

  const onUploaded = async ({ storageKey }: UploadResult) => {
    newestKey.current = storageKey;
    const { width: _width, height: _height, ...unsized } = latest.current;
    onChange({ ...unsized, storageKey });
    const src = resolveAssetUrl(storageKey);
    const size = src ? await intrinsicSize(src) : null;
    if (size && newestKey.current === storageKey) set({ storageKey, ...size });
  };

  return (
    <div className="flex flex-col gap-2">
      <UploadField category="image" label="Upload image" onUploaded={onUploaded} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium leading-none">Alt text</span>
        <Input
          aria-label="Image alt text"
          value={str(data.alt)}
          onChange={(e) => set({ alt: e.target.value })}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium leading-none">Caption (optional)</span>
        <Input
          aria-label="Image caption"
          value={captionText(str(data.caption))}
          onChange={(e) => set({ caption: captionMarkdown(e.target.value) })}
          className="text-sm"
        />
      </label>
      {str(data.storageKey) && <span className="text-xs text-muted-foreground">Image attached</span>}
    </div>
  );
}
