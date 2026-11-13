import { useCallback, useRef } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const ADDED = ['aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-activedescendant'] as const;

// The textbox role allows neither aria-expanded nor aria-controls, so the host is a combobox while its menu is open,
// and a combobox is never multi-line: both attributes it had come back on close.
const SWAPPED = ['role', 'aria-multiline'] as const;

type Opened = { readonly host: HTMLElement; readonly listboxId: string; close(): void };

function restore(host: HTMLElement, name: string, value: string | null): void {
  if (value === null) host.removeAttribute(name);
  else host.setAttribute(name, value);
}

type Held = { readonly saved: readonly (readonly [string, string | null])[]; readonly listboxes: string[] };

// One menu can open on a host in the same commit another closes on it, in either order, so the host's own attributes
// are saved by the first menu to hold it and given back by the last to let go.
const held = new WeakMap<HTMLElement, Held>();

function makeCombobox(host: HTMLElement, listboxId: string): void {
  host.setAttribute('role', 'combobox');
  host.removeAttribute('aria-multiline');
  host.setAttribute('aria-expanded', 'true');
  host.setAttribute('aria-controls', listboxId);
  host.setAttribute('aria-autocomplete', 'list');
}

function openCombobox(host: HTMLElement, listboxId: string): () => void {
  const saved = (): Held['saved'] => SWAPPED.map((name) => [name, host.getAttribute(name)] as const);
  const entry = held.get(host) ?? { saved: saved(), listboxes: [] };
  held.set(host, entry);
  entry.listboxes.push(listboxId);
  makeCombobox(host, listboxId);
  return () => {
    entry.listboxes.splice(entry.listboxes.lastIndexOf(listboxId), 1);
    const remaining = entry.listboxes.at(-1);
    if (remaining !== undefined) return makeCombobox(host, remaining);
    held.delete(host);
    for (const name of ADDED) host.removeAttribute(name);
    for (const [name, value] of entry.saved) restore(host, name, value);
  };
}

/**
 * While a menu is open on a host, makes the host the combobox that controls the menu's listbox and names its active
 * option, then gives the host back its own attributes when the menu closes or moves to another host. React may draw a
 * new element for the same host, as when its block changes type, so the host is looked up again after each change to
 * the document while the menu is open.
 */
export function useComboboxHost(
  controller: ViewController,
  block: string | null,
  region: string | null,
  listboxId: string,
  activeOptionId: string | null,
): void {
  const open = block !== null && region !== null;
  const docWhileOpen = useCallback((state: EditorState) => (open ? state.doc : null), [open]);
  useEditorState(controller, docWhileOpen);
  const opened = useRef<Opened | null>(null);

  useIsomorphicLayoutEffect(() => {
    const host = open ? (controller.registry.get(block, region) ?? null) : null;
    const last = opened.current;
    if (last?.host !== host || last.listboxId !== listboxId) {
      last?.close();
      opened.current = host && { host, listboxId, close: openCombobox(host, listboxId) };
    }
    if (opened.current !== null) restore(opened.current.host, 'aria-activedescendant', activeOptionId);
  });
  useIsomorphicLayoutEffect(
    () => () => {
      opened.current?.close();
      opened.current = null;
    },
    [],
  );
}
