'use client';

import { useRef } from 'react';
import { Sparkles } from '../../icons';
import { LIST_GROUP_LABEL, LIST_OPTION } from '../../ui/menu-styles';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { ACTION_ICONS } from './ai-action-icons';
import type { AiChoice } from './ai-choices';
import type { AiLabels } from './ai-labels';
import { menuSections, type ChoiceRow } from './ai-menu-sections';

type AiChoiceListProps = {
  id: string;
  labels: AiLabels;
  choices: readonly AiChoice[];
  current: number;
  onHighlight(index: number): void;
  onChoose(choice: AiChoice): void;
};

// The typed request can follow a group, and a line keeps it from reading as one of that group's actions.
const SET_APART = 'not-first:mt-1 not-first:border-t not-first:border-border not-first:pt-1';

export const choiceId = (listId: string, index: number) => `${listId}-${index}`;

const iconOf = (choice: AiChoice) => (choice.host === undefined ? ACTION_ICONS[choice.action] : (choice.host.icon ?? Sparkles));

/** The AI menu's listbox: the actions that write, those that edit and the host's own, each under its heading, then
 *  the typed request. */
export function AiChoiceList({ id, labels, choices, current, onHighlight, onChoose }: AiChoiceListProps) {
  const list = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [current, choices.length]);
  const option = ({ choice, index }: ChoiceRow) => {
    const Icon = iconOf(choice);
    return (
      <div
        key={choice.key}
        id={choiceId(id, index)}
        role="option"
        aria-selected={index === current}
        data-highlighted={index === current ? '' : undefined}
        className={LIST_OPTION}
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={() => onHighlight(index)}
        onClick={() => onChoose(choice)}
      >
        <Icon aria-hidden="true" className="text-muted-foreground" />
        {choice.label}
      </div>
    );
  };
  return (
    <div ref={list} id={id} role="listbox" aria-label={labels.menu} className="mt-1 max-h-72 overflow-y-auto">
      {menuSections(choices, labels).map((section) =>
        section.label === undefined ? (
          <div key={section.id} role="presentation" className={SET_APART}>
            {section.rows.map(option)}
          </div>
        ) : (
          <div key={section.id} role="group" aria-labelledby={`${id}-${section.id}`}>
            <div id={`${id}-${section.id}`} role="presentation" className={LIST_GROUP_LABEL}>
              {section.label}
            </div>
            {section.rows.map(option)}
          </div>
        ),
      )}
    </div>
  );
}
