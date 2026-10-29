import type { KeyboardEvent } from 'react';
import type { ViewController } from '../../view';

const NOT_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

function isTextField(element: Element): boolean {
  if (element instanceof HTMLInputElement) return !NOT_TEXT_INPUTS.has(element.type);
  if (element instanceof HTMLTextAreaElement) return true;
  const editable = element.closest('[contenteditable]');
  return editable !== null && editable.getAttribute('contenteditable') !== 'false';
}

function isHistoryKey(controller: ViewController, event: KeyboardEvent): boolean {
  const mod = controller.isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  const key = event.key.toLowerCase();
  return mod && !event.altKey && (key === 'z' || (key === 'y' && !event.shiftKey));
}

/** Undo and redo pressed on a control in a preview, which the canvas does not see, unless a text field keeps its own. */
export function runHistoryKey(controller: ViewController, event: KeyboardEvent): boolean {
  if (!isHistoryKey(controller, event) || isTextField(event.target as Element)) return false;
  return controller.edit(() => controller.editor.handleKey(event.nativeEvent));
}
