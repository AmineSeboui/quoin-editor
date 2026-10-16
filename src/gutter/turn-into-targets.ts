import type { ComponentType } from 'react';
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListCollapse,
  ListOrdered,
  ListTodo,
  MessageSquare,
  TextQuote,
  Type,
} from 'lucide-react';
import type { BlockAttrs } from '../engine';
import type { QuoinLabels } from '../i18n/labels';

export type TurnIntoTarget = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  type: string;
  attrs: BlockAttrs;
};

const HEADING_ICONS = [Heading1, Heading2, Heading3] as const;

export function turnIntoTargets(labels: QuoinLabels): TurnIntoTarget[] {
  const { blockNames } = labels;
  const line = (id: string, label: string, icon: TurnIntoTarget['icon'], attrs: BlockAttrs): TurnIntoTarget => ({
    id,
    label,
    icon,
    type: 'MARKDOWN',
    attrs,
  });
  return [
    line('text', blockNames.text, Type, { kind: 'paragraph' }),
    ...HEADING_ICONS.map((icon, i) => {
      const level = i + 1;
      return line(`heading${level}`, labels.heading(level), icon, { kind: 'heading', level });
    }),
    line('bulletedList', blockNames.bulletedList, List, { kind: 'bullet' }),
    line('numberedList', blockNames.numberedList, ListOrdered, { kind: 'ordered' }),
    line('todoList', blockNames.todoList, ListTodo, { kind: 'task' }),
    line('quote', blockNames.quote, TextQuote, { kind: 'quote' }),
    { id: 'callout', label: blockNames.callout, icon: MessageSquare, type: 'CALLOUT', attrs: {} },
    { id: 'toggle', label: blockNames.toggle, icon: ListCollapse, type: 'TOGGLE', attrs: {} },
    { id: 'code', label: blockNames.code, icon: Code, type: 'CODE', attrs: {} },
  ];
}
