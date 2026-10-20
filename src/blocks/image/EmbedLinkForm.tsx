'use client';

import { useId, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useLabels } from '../../i18n/use-labels';
import { linkAddress } from '../../menus/link/link-address';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { ViewController } from '../../view';
import { setBlockAttrs } from '../text/set-block-attrs';
import { focusNode } from '../void/select-node';

/** The address of a picture to embed rather than upload, refused when the engine would not keep it as a link. */
export function EmbedLinkForm({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const labels = useLabels();
  const [address, setAddress] = useState('');
  const [invalid, setInvalid] = useState(false);
  const messageId = useId();

  const embed = (event: FormEvent) => {
    event.preventDefault();
    const url = linkAddress(address);
    if (url === null) {
      setInvalid(true);
      return;
    }
    setBlockAttrs(controller, blockId, { url });
    focusNode(controller, blockId);
  };

  return (
    <form noValidate className="quoin-image-link" onSubmit={embed}>
      <Input
        type="url"
        autoFocus
        className="h-8"
        aria-label={labels.imageLink}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? messageId : undefined}
        value={address}
        onChange={(event) => {
          setAddress(event.target.value);
          setInvalid(false);
        }}
      />
      <Button type="submit" variant="ghost" size="icon-sm" aria-label={labels.linkApply}>
        <Check />
      </Button>
      {invalid && (
        <p id={messageId} role="alert" className="quoin-image-message">
          {labels.invalidLink}
        </p>
      )}
    </form>
  );
}
