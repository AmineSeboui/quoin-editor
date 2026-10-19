'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';

/** Props for `FilePickerButton`. */
export type FilePickerButtonProps = {
  /** Labels the button and the file input behind it. */
  label: string;
  /** An `accept` attribute for the file input, such as `'image/*'` or `'.pdf'`. */
  accept?: string;
  /** Greys the button out and disables the input behind it. After a pick, focus the browser dropped while it was disabled comes back once it is enabled again. */
  disabled?: boolean;
  /** Greys the button out and refuses picks, as `disabled` does, but leaves the input focusable, so focus stays on it while an upload runs. */
  busy?: boolean;
  /** Called with the chosen file, and again if the same file is picked after a failure. */
  onPick: (file: File) => void;
};

/** A button that opens the file picker and hands back the chosen file, performing no upload of its own. */
// The input itself stays focusable and labelled, laid transparently over the
// button, so the keyboard and the pointer both land on the real control. The
// wrapper paints the focus ring the invisible input cannot show.
export function FilePickerButton({ label, accept, disabled, busy = false, onPick }: FilePickerButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const restoreFocus = React.useRef(false);

  // A browser moves focus to the body when the focused input is disabled, and does not move it back when the input is enabled again.
  React.useEffect(() => {
    if (disabled || !restoreFocus.current) return;
    restoreFocus.current = false;
    const { activeElement } = document;
    if (activeElement === null || activeElement === document.body) inputRef.current?.focus();
  }, [disabled]);

  return (
    <span className="relative inline-flex rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--quoin-ring)]">
      <Button asChild variant="outline" size="sm">
        <span aria-hidden="true" className={disabled || busy ? 'pointer-events-none opacity-50' : undefined}>
          <Upload aria-hidden="true" />
          {label}
        </span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        disabled={disabled}
        aria-disabled={busy || undefined}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed"
        onClick={(e) => {
          if (busy) e.preventDefault();
        }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clear so picking the same file again still fires `change`, which is what makes retry after a failed upload work.
          e.target.value = '';
          if (!file || busy) return;
          restoreFocus.current = true;
          onPick(file);
        }}
      />
    </span>
  );
}
