'use client';

import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { PluginKey } from '../../engine';
import type { SuggestionRange } from '../../extensions/ui-types';
import { HIGHLIGHT_BAR } from '../../ui/focus';
import { MENU_CONTENT } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { TAP_TARGET_FLOOR } from '../../ui/touch-target';
import { cn } from '../../ui/cn';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { useRangeAnchor } from '../floating/use-range-anchor';
import type { SuggestionSection } from './group-items';
import type { SuggestionState } from './suggestion-plugin';
import { useSuggestion } from './use-suggestion';

export type SuggestionMenuProps<T> = {
  controller: ViewController;
  pluginKey: PluginKey<SuggestionState>;
  items: (query: string) => readonly T[] | Promise<readonly T[]>;
  itemKey(item: T): string;
  renderItem(item: T, active: boolean): ReactNode;
  groupOf?(item: T): string | null;
  onSelect(item: T, range: SuggestionRange): void;
  label: string;
  emptyLabel: string;
};

const CONTENT = cn(MENU_CONTENT, 'w-72 max-h-[min(22rem,var(--radix-popper-available-height))]');
const GROUP_LABEL = 'px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground';
const OPTION = cn(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  HIGHLIGHT_BAR,
  TAP_TARGET_FLOOR,
);

// A press on an option would move focus out of the text. A touch moves focus only through the mouse events that follow
// it, and WebKit drops the click of a tap whose pointerdown was cancelled, so a touch is held at mousedown instead.
const keepFocus = (event: PointerEvent | MouseEvent) => {
  if (!('pointerType' in event) || event.pointerType !== 'touch') event.preventDefault();
};
const preventDefault = (event: Event) => event.preventDefault();

type OptionProps = { id: string; active: boolean; onHighlight(): void; onChoose(): void; children: ReactNode };

function SuggestionOption({ id, active, onHighlight, onChoose, children }: OptionProps) {
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      data-highlighted={active ? '' : undefined}
      className={OPTION}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onPointerMove={onHighlight}
      onClick={onChoose}
    >
      {children}
    </div>
  );
}

type SectionProps<T> = {
  section: SuggestionSection<T>;
  labelId: string;
  activeIndex: number;
  optionId(item: T): string;
  renderItem(item: T, active: boolean): ReactNode;
  highlight(index: number): void;
  select(index: number): void;
};

function SuggestionGroup<T>({ section, labelId, activeIndex, optionId, renderItem, highlight, select }: SectionProps<T>) {
  const options = section.entries.map(({ item, index }) => (
    <SuggestionOption
      key={optionId(item)}
      id={optionId(item)}
      active={index === activeIndex}
      onHighlight={() => highlight(index)}
      onChoose={() => select(index)}
    >
      {renderItem(item, index === activeIndex)}
    </SuggestionOption>
  ));
  if (section.label === null) return <>{options}</>;
  return (
    <div role="group" aria-labelledby={labelId}>
      <div role="presentation" id={labelId} className={GROUP_LABEL}>
        {section.label}
      </div>
      {options}
    </div>
  );
}

/** A listbox of suggestions for the trigger at the caret, which keeps focus in the text as a combobox's popup does. */
export function SuggestionMenu<T>(props: SuggestionMenuProps<T>) {
  const { controller, renderItem, label, emptyLabel } = props;
  const suggestion = useSuggestion(props);
  const { trigger, sections, activeIndex, listboxId } = suggestion;
  const { anchor, side } = useRangeAnchor(controller, trigger);
  const listbox = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    listbox.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, sections]);

  if (trigger === null) return null;
  const insideEditor = (event: { target: EventTarget | null; preventDefault(): void }) => {
    if (event.target instanceof Node && controller.root?.contains(event.target)) event.preventDefault();
  };
  const empty = sections.length === 0 && !suggestion.pending;
  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) suggestion.dismiss();
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        // Radix makes the content a dialog; the listbox inside it is the popup the text controls.
        role={undefined}
        side={side}
        align="start"
        className={CONTENT}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={preventDefault}
        onPointerDownOutside={insideEditor}
        onFocusOutside={insideEditor}
      >
        <div ref={listbox} role="listbox" id={listboxId} aria-label={label}>
          {sections.map((section, index) => (
            <SuggestionGroup
              key={section.label ?? ''}
              section={section}
              labelId={`${listboxId}-group-${index}`}
              activeIndex={activeIndex}
              optionId={suggestion.optionId}
              renderItem={renderItem}
              highlight={suggestion.highlight}
              select={suggestion.select}
            />
          ))}
        </div>
        {empty && <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>}
      </PopoverContent>
    </Popover>
  );
}
