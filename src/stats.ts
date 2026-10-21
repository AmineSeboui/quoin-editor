'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { statsExtension, type StatsOptions } from './extensions/stats/stats-extension';
export { englishStatsLabels, type StatsLabels } from './extensions/stats/stats-labels';
export { useEditorStats, type EditorStats } from './extensions/stats/use-editor-stats';
