'use client';

import { Copy } from 'lucide-react';
import { copyText } from '../../gutter/copy-text';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';

export function CopyCodeButton({ code, controller }: { code: string; controller: ViewController }) {
  const labels = useLabels();
  const copy = async () => {
    if (await copyText(code, controller.root?.ownerDocument)) controller.announce(labels.copied);
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      tabIndex={-1}
      aria-label={labels.copyCode}
      className="quoin-code-control"
      onClick={() => void copy()}
    >
      <Copy aria-hidden="true" />
    </Button>
  );
}
