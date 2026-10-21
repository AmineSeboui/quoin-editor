'use client';

import { useFocusMode } from '../focus/use-focus-mode';
import type { Limit } from '../limit/limit-plugin';
import { useLimitAnnouncement } from '../limit/use-limit-announcement';
import type { ViewController } from '../../view';
import type { StatsLabels } from './stats-labels';
import { StatsFooter } from './StatsFooter';

export type StatsOverlayProps = {
  controller: ViewController;
  labels: StatsLabels;
  footer: boolean;
  limit?: number;
  guard: Limit | null;
  focusMode: boolean;
};

export function StatsOverlay({ controller, labels, footer, limit, guard, focusMode }: StatsOverlayProps) {
  useLimitAnnouncement(controller, guard, limit === undefined ? '' : labels.limitReached(limit));
  useFocusMode(controller, focusMode);
  return footer ? <StatsFooter controller={controller} labels={labels} limit={limit} /> : null;
}
