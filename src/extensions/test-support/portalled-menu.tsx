import { useState } from 'react';
import { createPortal } from 'react-dom';
import { defineExtension } from '../../engine';
import type { ExtensionUI } from '../ui-types';

/** Opens or closes the menu `portalledMenu(name)` draws. */
export const menuShown: Record<string, (open: boolean) => void> = {};

/** An extension whose canvas draws an open menu, a button named `name`, portalled to the body as the canvas's are. */
export function portalledMenu(name: string) {
  function Menu() {
    const [open, setOpen] = useState(true);
    menuShown[name] = setOpen;
    return open ? createPortal(<button className="quoin">{name}</button>, document.body) : null;
  }
  const ui: ExtensionUI = { overlays: [Menu] };
  return defineExtension({ name: `menu-${name}`, ui });
}
