'use client';

import { useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useLabels } from '../../i18n/use-labels';
import { SuggestionOption } from '../../menus/suggestion/SuggestionOption';
import { FOCUS_RING } from '../../ui/focus';
import { MENU_CONTENT } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { setBlockAttrs } from '../text/set-block-attrs';
import { languageId, languageName, languageOptions } from './code-languages';

const FIELD = `quoin-code-language quoin-code-control ${FOCUS_RING}`;
// The listbox scrolls rather than the popover around it, as the combobox's own popup, which the arrows walk while focus
// stays in the field.
const CONTENT = `${MENU_CONTENT} flex max-h-64 w-48 flex-col overflow-y-hidden`;

const preventDefault = (event: Event) => event.preventDefault();

type LanguageComboboxProps = {
  blockId: string;
  controller: ViewController;
  language: string;
  field: RefObject<HTMLInputElement | null>;
  onDone(): void;
};

/**
 * The language of a code block: a listed language picked from a list it filters as it is typed in, or any text typed
 * and confirmed with Enter. Leaving it any other way keeps the language it had.
 */
export function LanguageCombobox({ blockId, controller, language, field, onDone }: LanguageComboboxProps) {
  const labels = useLabels();
  const listboxId = useId();
  const list = useRef<HTMLDivElement>(null);
  const shown = languageName(language) ?? language;
  const [draft, setDraft] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const options = draft === null ? [] : languageOptions(draft === shown ? '' : draft, labels.plainText);
  const open = options.length > 0;
  const optionId = (index: number) => `${listboxId}-${index}`;

  useIsomorphicLayoutEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const close = () => {
    setDraft(null);
    setActive(-1);
  };
  const choose = (value: string) => {
    if (value !== language) setBlockAttrs(controller, blockId, { language: value });
    close();
  };
  const commit = () => {
    const option = options[active];
    if (option !== undefined) choose(option.id);
    else if (draft !== null && draft !== shown) choose(languageId(draft));
    else close();
    onDone();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposingKey(controller, event.nativeEvent)) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => Math.min(Math.max(index + step, 0), options.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      onDone();
    }
  };

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <input
          ref={field}
          role="combobox"
          aria-label={labels.codeLanguage}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          value={draft ?? shown}
          placeholder={labels.plainText}
          tabIndex={-1}
          spellCheck={false}
          autoComplete="off"
          className={FIELD}
          onFocus={(event) => {
            setDraft(shown);
            event.currentTarget.select();
          }}
          onBlur={close}
          onChange={(event) => {
            setDraft(event.target.value);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
        />
      </PopoverAnchor>
      <PopoverContent
        role={undefined}
        align="start"
        className={CONTENT}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
      >
        <div ref={list} role="listbox" id={listboxId} aria-label={labels.codeLanguage} className="min-h-0 overflow-y-auto">
          {options.map((option, index) => (
            <SuggestionOption
              key={option.id}
              id={optionId(index)}
              active={index === active}
              onHighlight={() => setActive(index)}
              onChoose={() => {
                choose(option.id);
                onDone();
              }}
            >
              {option.name}
            </SuggestionOption>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
