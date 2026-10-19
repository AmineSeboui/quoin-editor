'use client';

import { useId, useMemo } from 'react';
import type { QuoinLabels } from '../i18n/labels';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { shortcutGroups, type ShortcutGroup } from './shortcut-groups';

const KEYS = 'rounded border bg-muted px-1.5 py-0.5 font-sans text-xs whitespace-nowrap';

function ShortcutSection({ group }: { group: ShortcutGroup }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="mb-2 text-sm font-semibold">
        {group.title}
      </h3>
      <dl className="grid gap-1.5 text-sm">
        {group.items.map(({ label, keys }) => (
          <div key={keys} className="flex items-center justify-between gap-4">
            <dt>{label}</dt>
            <dd>
              <kbd className={KEYS}>{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type ShortcutsDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  labels: QuoinLabels;
  isMac: boolean;
  onCloseAutoFocus?(event: Event): void;
};

export function ShortcutsDialog({ open, onOpenChange, labels, isMac, onCloseAutoFocus }: ShortcutsDialogProps) {
  const groups = useMemo(() => shortcutGroups(labels, isMac), [labels, isMac]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={labels.close}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{labels.shortcuts}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {groups.map((group) => (
            <ShortcutSection key={group.title} group={group} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
