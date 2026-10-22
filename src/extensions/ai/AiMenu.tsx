'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../../ui/cn';
import { Input } from '../../ui/input';
import { MENU_ITEM } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { ASKS_FOR_PROMPT, EMPTY_LINE_ACTIONS, MENU_ACTIONS, type AiAction } from './ai-actions';
import { askFrom, type AiEnv } from './ai-env';
import { closeMenu } from './ai-flow';
import type { AiTarget } from './ai-target';
import { useTargetAnchor } from './use-ai-anchors';

type Choice = { readonly action: AiAction; readonly label: string };

type AiMenuProps = { env: AiEnv; target: AiTarget; fromSpace: boolean };

function choicesFor(env: AiEnv, target: AiTarget, query: string): Choice[] {
  const { labels } = env;
  const emptyLine = !target.selected && target.to.offset === 0;
  const wanted = query.trim().toLowerCase();
  const actions = (emptyLine ? EMPTY_LINE_ACTIONS : MENU_ACTIONS).filter((action) =>
    labels.actions[action].toLowerCase().includes(wanted),
  );
  const listed = actions.map((action) => ({ action, label: labels.actions[action] }));
  return wanted === '' ? listed : [...listed, { action: 'custom', label: labels.ask(query.trim()) }];
}

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
  const optionId = (index: number) => `${id}-${index}`;

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
        {choices.length > 0 && (
          <ul id={`${id}-list`} role="listbox" aria-label={labels.menu} className="mt-1 max-h-72 overflow-y-auto">
            {choices.map((choice, index) => (
              <li
                key={choice.action}
                id={optionId(index)}
                role="option"
                aria-selected={index === current}
                className={cn(MENU_ITEM, index === current && 'bg-accent text-accent-foreground')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(choice)}
              >
                {choice.label}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
