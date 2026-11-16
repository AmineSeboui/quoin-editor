'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLabels } from '../../i18n/use-labels';
import { Check } from '../../icons';
import { linkAddress } from '../../menus/link/link-address';
import { Field, FieldError, FieldLabel } from '../../ui/field';
import { IconButton } from '../../ui/icon-button';
import { Input } from '../../ui/input';
import type { ViewController } from '../../view';
import { setBlockAttrs } from '../text/set-block-attrs';
import { focusNode } from '../void/select-node';

/** The address of a picture to embed rather than upload, refused when the engine would not keep it as a link. */
export function EmbedLinkForm({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const labels = useLabels();
  const [address, setAddress] = useState('');
  const [invalid, setInvalid] = useState(false);
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

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
      <Field>
        <FieldLabel htmlFor={fieldId}>{labels.imageLink}</FieldLabel>
        <div className="flex items-center gap-0.5">
          <Input
            id={fieldId}
            type="url"
            autoFocus
            className="h-8"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? messageId : undefined}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setInvalid(false);
            }}
          />
          <IconButton type="submit" variant="ghost" size="icon-sm" label={labels.linkApply}>
            <Check />
          </IconButton>
        </div>
        <FieldError id={messageId}>{invalid ? labels.invalidLink : null}</FieldError>
      </Field>
    </form>
  );
}
