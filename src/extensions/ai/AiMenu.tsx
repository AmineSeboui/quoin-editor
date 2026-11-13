'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { ASKS_FOR_PROMPT, type AiAction } from './ai-actions';
import { choicesFor, type AiChoice } from './ai-choices';
import { askFrom, askHost, type AiEnv } from './ai-env';
import { closeMenu } from './ai-flow';
import { englishAiLabels } from './ai-labels';
import type { AiTarget } from './ai-target';
import { AiChoiceList, choiceId } from './AiChoiceList';
import { useTargetAnchor } from './use-target-anchor';

type AiMenuProps = { env: AiEnv; target: AiTarget; fromSpace: boolean };

/**
 * The AI menu beside its target: a field to type a request in, over the actions that match it. Opened by the writer,
 * it takes focus; Escape gives it back to the text, and after a Space opened it, a Space or Escape types that space.
 */
export function AiMenu({ env, target, fromSpace }: AiMenuProps) {
  const { controller, labels } = env;
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState<AiAction | null>(null);
  const [active, setActive] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const anchor = useTargetAnchor(controller, target);
  const id = useId();
  const choices = asking === null ? choicesFor(env, target, query) : [];
  const current = Math.min(active, choices.length - 1);
  const listId = `${id}-list`;

  const close = (typeSpace: boolean) => {
    closeMenu(controller.editor);
    controller.focus();
    if (typeSpace) controller.edit(() => controller.editor.insertText(' '));
  };
  const choose = (choice: AiChoice) => {
    if (choice.host !== undefined) return askHost(env, choice.host);
    const { action } = choice;
    if (!ASKS_FOR_PROMPT.has(action)) return askFrom(env, action, action === 'custom' ? query.trim() : undefined);
    setAsking(action);
    setQuery('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step !== 0 && choices.length > 0) {
      event.preventDefault();
      setActive((current + step + choices.length) % choices.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (asking !== null && query.trim() !== '') askFrom(env, asking, query.trim());
      else if (choices[current] !== undefined) choose(choices[current]);
    } else if (event.key === ' ' && fromSpace && query === '' && asking === null) {
      event.preventDefault();
      close(true);
    }
  };
  const fieldLabel = asking === 'tone' ? labels.tonePrompt : asking === 'translate' ? labels.translatePrompt : labels.prompt;

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(next) => {
        if (!next) closeMenu(controller.editor);
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        aria-label={labels.askAi}
        side="bottom"
        align="start"
        className="w-80 p-1"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          field.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          close(fromSpace);
        }}
      >
        <Input
          ref={field}
          role="combobox"
          aria-label={fieldLabel}
          placeholder={fieldLabel}
          aria-expanded={choices.length > 0}
          aria-controls={choices.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={choices.length > 0 ? choiceId(listId, current) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {choices.length > 0 && (
          <AiChoiceList
            id={listId}
            label={labels.menu}
            hostLabel={labels.moreActions ?? englishAiLabels.moreActions}
            choices={choices}
            current={current}
            onChoose={choose}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
