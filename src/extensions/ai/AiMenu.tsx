'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Sparkles } from '../../icons';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../../ui/input-group';
import { LIST_GROUP_LABEL, LIST_OPTION } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { ACTION_ICONS } from './ai-action-icons';
import { ASKS_FOR_PROMPT, type AiAction } from './ai-actions';
import { askFrom, type AiEnv } from './ai-env';
import { closeMenu } from './ai-flow';
import { englishAiLabels } from './ai-labels';
import { menuSections, type Choice } from './ai-menu-sections';
import type { AiTarget } from './ai-target';
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
  const sections = asking === null ? menuSections(env, target, query) : [];
  const choices = sections.flatMap((section) => section.choices);
  const current = Math.min(active, choices.length - 1);
  const optionId = (index: number) => `${id}-${index}`;
  const typed = query.trim();

  const close = (typeSpace: boolean) => {
    closeMenu(controller.editor);
    controller.focus();
    if (typeSpace) controller.edit(() => controller.editor.insertText(' '));
  };
  const choose = ({ action }: Choice) => {
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
  const option = (choice: Choice) => {
    const index = choices.indexOf(choice);
    const Icon = ACTION_ICONS[choice.action];
    return (
      <div
        key={choice.action}
        id={optionId(index)}
        role="option"
        aria-selected={index === current}
        data-highlighted={index === current ? '' : undefined}
        className={LIST_OPTION}
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={() => setActive(index)}
        onClick={() => choose(choice)}
      >
        <Icon aria-hidden="true" className="text-muted-foreground" />
        {choice.label}
      </div>
    );
  };

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
        className="w-80 gap-0 rounded-xl p-1"
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
        <InputGroup className="h-8 border-input/30 bg-input/30 shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-input/30 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
          <InputGroupAddon>
            <Sparkles />
          </InputGroupAddon>
          <InputGroupInput
            ref={field}
            role="combobox"
            aria-label={fieldLabel}
            placeholder={fieldLabel}
            aria-expanded={choices.length > 0}
            aria-controls={choices.length > 0 ? `${id}-list` : undefined}
            aria-autocomplete="list"
            aria-activedescendant={choices.length > 0 ? optionId(current) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              variant="default"
              size="icon-xs"
              aria-label={labels.send ?? englishAiLabels.send}
              disabled={typed === ''}
              onClick={() => askFrom(env, asking ?? 'custom', typed)}
            >
              <ArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {choices.length > 0 && (
          <div id={`${id}-list`} role="listbox" aria-label={labels.menu} className="mt-1 max-h-72 overflow-y-auto">
            {sections.map((section) =>
              section.label === undefined ? (
                section.choices.map(option)
              ) : (
                <div key={section.id} role="group" aria-labelledby={`${id}-${section.id}`}>
                  <div id={`${id}-${section.id}`} role="presentation" className={LIST_GROUP_LABEL}>
                    {section.label}
                  </div>
                  {section.choices.map(option)}
                </div>
              ),
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
