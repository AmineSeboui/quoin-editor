'use client';

import { Check } from 'lucide-react';
import { useLabels } from '../i18n/use-labels';
import { UploadField } from '../upload/UploadField';
import type { BlockEditorProps } from '../types';
import { str } from './str';

export function FileBlockEditor({ data, onChange }: BlockEditorProps) {
  const labels = useLabels();
  const set = (patch: Record<string, unknown>) => onChange({ ...data, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <UploadField
        category="file"
        label={labels.uploadFile}
        onUploaded={(r) => set({ storageKey: r.storageKey, filename: r.filename, size: r.size })}
      />
      {str(data.filename) && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {str(data.filename)}
          <Check aria-hidden="true" className="size-3" />
        </span>
      )}
    </div>
  );
}
