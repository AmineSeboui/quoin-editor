'use client';

import { useLabels } from '../i18n/use-labels';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { BlockEditorProps } from '../types';
import { str } from './str';

export function CodeBlockEditor({ data, onChange }: BlockEditorProps) {
  const labels = useLabels();
  const set = (patch: Record<string, unknown>) => onChange({ ...data, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium leading-none">{labels.codeLanguage}</span>
        <Input
          aria-label={labels.codeLanguage}
          value={str(data.language)}
          onChange={(e) => set({ language: e.target.value })}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium leading-none">{labels.codeText}</span>
        <Textarea
          aria-label={labels.codeText}
          value={str(data.code)}
          onChange={(e) => set({ code: e.target.value })}
          className="min-h-32 font-mono text-sm"
        />
      </label>
    </div>
  );
}
