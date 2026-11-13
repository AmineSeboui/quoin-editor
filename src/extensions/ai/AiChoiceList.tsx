'use client';

import { Fragment } from 'react';
import { cn } from '../../ui/cn';
import { MENU_ITEM } from '../../ui/menu-styles';
import type { AiChoice } from './ai-choices';

type Row = { readonly choice: AiChoice; readonly index: number };

type Run = { readonly host: boolean; readonly rows: Row[] };

function runsOf(choices: readonly AiChoice[]): Run[] {
  const runs: Run[] = [];
  choices.forEach((choice, index) => {
    const host = choice.host !== undefined;
    const last = runs[runs.length - 1];
    if (last?.host === host) last.rows.push({ choice, index });
    else runs.push({ host, rows: [{ choice, index }] });
  });
  return runs;
}

type AiChoiceListProps = {
  id: string;
  label: string;
  hostLabel: string;
  choices: readonly AiChoice[];
  current: number;
  onChoose(choice: AiChoice): void;
};

const GROUP_HEADING = 'px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground';

// The typed request can follow the host's group, and a line keeps it from reading as one of them.
const SET_APART = 'not-last:mb-1 not-last:border-b not-last:border-border not-last:pb-1';

export const choiceId = (listId: string, index: number) => `${listId}-${index}`;

/** The AI menu's listbox: the built-in actions, then the host's in a group under a heading of their own. */
export function AiChoiceList({ id, label, hostLabel, choices, current, onChoose }: AiChoiceListProps) {
  const option = ({ choice, index }: Row) => (
    <div
      key={choice.key}
      id={choiceId(id, index)}
      role="option"
      aria-selected={index === current}
      className={cn(MENU_ITEM, index === current && 'bg-accent text-accent-foreground')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChoose(choice)}
    >
      {choice.label}
    </div>
  );
  return (
    <div id={id} role="listbox" aria-label={label} className="mt-1 max-h-72 overflow-y-auto">
      {runsOf(choices).map(({ host, rows }, run) =>
        host ? (
          <div key={run} role="group" aria-labelledby={`${id}-host`} className={SET_APART}>
            <div role="presentation" id={`${id}-host`} className={GROUP_HEADING}>
              {hostLabel}
            </div>
            {rows.map(option)}
          </div>
        ) : (
          <Fragment key={run}>{rows.map(option)}</Fragment>
        ),
      )}
    </div>
  );
}
