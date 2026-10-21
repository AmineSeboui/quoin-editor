'use client';

import { defineExtension, typographyRules, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import { focusDecorations } from '../focus/focus-decorations';
import { createLimit } from '../limit/limit-plugin';
import type { ExtensionUI } from '../ui-types';
import { resolveStatsLabels, type StatsLabels } from './stats-labels';
import { StatsOverlay } from './StatsOverlay';

export type StatsOptions = {
  /** Shows the counts under the document. On by default. */
  footer?: boolean;
  /**
   * The most characters the document may hold, counted as the footer counts them: the cells of a table without the
   * separators between them, and nothing for an image, a file, an embed or a bookmark, so attaching one never counts.
   * Anything but a finite number of zero or more is no limit.
   */
  limit?: number;
  /** Dims every block but those the selection touches, while the canvas is editable and holds focus. */
  focusMode?: boolean;
  /** Turns quotes, dashes, arrows and the like into their typographic forms as they are typed. */
  typography?: boolean | { dashes?: 'em' | 'en' | 'none' };
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<StatsLabels>;
};

/** Counts of the document under it, and optionally a character limit, focus mode and typographic input rules. */
export function statsExtension(options: StatsOptions = {}): Extension {
  const { footer = true, focusMode = false, typography = false, limit: given } = options;
  const limit = given !== undefined && Number.isFinite(given) && given >= 0 ? given : undefined;
  const labels = resolveStatsLabels(options.labels);
  const guard = limit === undefined ? null : createLimit(limit);
  const Overlay = ({ controller }: { controller: ViewController }) => (
    <StatsOverlay
      controller={controller}
      labels={labels}
      footer={footer}
      limit={limit}
      guard={guard}
      focusMode={focusMode}
    />
  );
  const ui: ExtensionUI = { overlays: [Overlay] };
  return defineExtension({
    name: 'stats',
    ...(guard && { filterTransaction: guard.filterTransaction }),
    ...(focusMode && { decorations: focusDecorations }),
    ...(typography && { inputRules: typographyRules(typography === true ? {} : typography) }),
    ui,
  });
}
