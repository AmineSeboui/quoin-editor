'use client';

import type { ComponentType } from 'react';
import { CaseSensitive, Regex, WholeWord } from 'lucide-react';
import type { SearchOptions } from '../../engine/find/find-types';
import { Button } from '../../ui/button';
import type { FindLabels } from './find-labels';

type Toggle = { option: keyof SearchOptions; label: keyof FindLabels; icon: ComponentType<{ className?: string }> };

const TOGGLES: readonly Toggle[] = [
  { option: 'caseSensitive', label: 'matchCase', icon: CaseSensitive },
  { option: 'wholeWord', label: 'wholeWord', icon: WholeWord },
  { option: 'regex', label: 'regularExpression', icon: Regex },
];

type Props = { labels: FindLabels; options: SearchOptions; onToggle(option: keyof SearchOptions): void };

/** The buttons that turn each option of the search on and off. */
export function FindToggles({ labels, options, onToggle }: Props) {
  return TOGGLES.map(({ option, label, icon: Icon }) => {
    const name = labels[label] as string;
    return (
      <Button
        key={option}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={name}
        title={name}
        aria-pressed={options[option]}
        className="aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        onClick={() => onToggle(option)}
      >
        <Icon aria-hidden />
      </Button>
    );
  });
}
