import { useRef } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const ADDED = ['aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-activedescendant'] as const;

// The textbox role allows neither aria-expanded nor aria-controls, so the host is a combobox while its menu is open,
// and a combobox is never multi-line: both attributes it had come back on close.
const SWAPPED = ['role', 'aria-multiline'] as const;

function restore(host: HTMLElement, name: string, value: string | null): void {
  if (value === null) host.removeAttribute(name);
  else host.setAttribute(name, value);
}

function openCombobox(host: HTMLElement, listboxId: string): () => void {
  const saved = SWAPPED.map((name) => [name, host.getAttribute(name)] as const);
  host.setAttribute('role', 'combobox');
  host.removeAttribute('aria-multiline');
  host.setAttribute('aria-expanded', 'true');
  host.setAttribute('aria-controls', listboxId);
  host.setAttribute('aria-autocomplete', 'list');
  return () => {
    for (const name of ADDED) host.removeAttribute(name);
    for (const [name, value] of saved) restore(host, name, value);
  };
}

/**
 * While a menu is open on a host, makes the host the combobox that controls the menu's listbox and names its active
 * option, then gives the host back its own attributes when the menu closes or moves to another host.
 */
export function useComboboxHost(
  controller: ViewController,
  block: string | null,
  region: string | null,
  listboxId: string,
  activeOptionId: string | null,
): void {
  const host = useRef<HTMLElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    host.current = block === null || region === null ? null : (controller.registry.get(block, region) ?? null);
    return host.current === null ? undefined : openCombobox(host.current, listboxId);
  }, [controller, block, region, listboxId]);
  useIsomorphicLayoutEffect(() => {
    if (host.current !== null) restore(host.current, 'aria-activedescendant', activeOptionId);
  }, [block, region, activeOptionId]);
}
