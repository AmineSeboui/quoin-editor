import type { ComponentType } from 'react';

/** A menu row's icon, hidden from assistive technology whatever component draws it. */
export function MenuIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return (
    <span aria-hidden="true" className="flex shrink-0">
      <Icon className="size-4" />
    </span>
  );
}
