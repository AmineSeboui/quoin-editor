'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../../gutter/copy-text';
import { useLabels } from '../../i18n/use-labels';
import { Button } from '../../ui/button';
import type { ViewController } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';

const COPIED_FOR_MS = 1500;

export function CopyCodeButton({ code, controller }: { code: string; controller: ViewController }) {
  const labels = useLabels();
  const readOnly = useReadOnly(controller);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!(await copyText(code, controller.root?.ownerDocument))) return;
    setCopied(true);
    controller.announce(labels.copied);
  };
  const Icon = copied ? Check : Copy;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      tabIndex={readOnly ? undefined : -1}
      aria-label={labels.copyCode}
      className="quoin-code-control"
      onClick={() => void copy()}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
