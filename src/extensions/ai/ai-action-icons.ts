import type { ComponentType } from 'react';
import {
  AudioLines,
  CircleHelp,
  Feather,
  FoldVertical,
  Languages,
  ListCollapse,
  PenLine,
  Sparkles,
  SpellCheck,
  UnfoldVertical,
  WandSparkles,
} from '../../icons';
import type { AiAction } from './ai-actions';

/** The icon beside each action in the AI menu. */
export const ACTION_ICONS: Readonly<Record<AiAction, ComponentType<{ className?: string }>>> = {
  continue: PenLine,
  summarize: ListCollapse,
  explain: CircleHelp,
  improve: WandSparkles,
  fix: SpellCheck,
  shorten: FoldVertical,
  lengthen: UnfoldVertical,
  simplify: Feather,
  tone: AudioLines,
  translate: Languages,
  custom: Sparkles,
};
