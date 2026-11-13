'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUp } from '../../icons';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '../../ui/input-group';
import { englishAiLabels, type AiLabels } from './ai-labels';

type AiFollowUpProps = { labels: AiLabels; onSend(request: string): void };

/** The field under an answer for a further request about it: Enter sends, Shift+Enter breaks the line. */
export function AiFollowUp({ labels, onSend }: AiFollowUpProps) {
  const [next, setNext] = useState('');
  const typed = next.trim();
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (typed === '') return;
    onSend(typed);
    setNext('');
  };

  return (
    <form className="w-full" onSubmit={send}>
      <InputGroup>
        <InputGroupTextarea
          rows={1}
          aria-label={labels.followUp}
          placeholder={labels.followUp}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-xs"
            aria-label={labels.send ?? englishAiLabels.send}
            disabled={typed === ''}
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
