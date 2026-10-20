import type { ComponentType } from 'react';

export function MenuIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return (
    <span aria-hidden="true" className="flex shrink-0">
      <Icon className="size-4" />
    </span>
  );
}
