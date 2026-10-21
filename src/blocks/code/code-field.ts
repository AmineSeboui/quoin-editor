import type { CodeField } from './code-edits';

export const fieldOf = (area: HTMLTextAreaElement): CodeField => ({
  value: area.value,
  start: area.selectionStart,
  end: area.selectionEnd,
});

export function applyCodeEdit(area: HTMLTextAreaElement, next: CodeField, write: (value: string) => void): void {
  write(next.value);
  area.setSelectionRange(next.start, next.end);
}
