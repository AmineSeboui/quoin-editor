'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { findExtension, type FindOptions } from './extensions/find/find-extension';
export { englishFindLabels, type FindLabels } from './extensions/find/find-labels';
export { findMatches } from './engine/find/find-matches';
export { replaceMatches } from './engine/find/replace-matches';
export type { FindMatch, FindQuery, FindResult, SearchOptions } from './engine/find/find-types';
