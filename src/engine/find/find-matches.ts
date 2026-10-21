import { compareRegionNames } from '../model/compare';
import type { EngineBlock, EngineDoc } from '../model/types';
import { findPattern } from './find-pattern';
import type { FindMatch, SearchOptions, FindResult } from './find-types';
import { textRuns } from './text-runs';

/** Finds the matches of one search block by block, keeping those of each block object for as long as it lives. */
export type BlockMatcher = (block: EngineBlock) => readonly FindMatch[];

function regionMatches(pattern: RegExp, block: EngineBlock, region: string): FindMatch[] {
  const matches: FindMatch[] = [];
  for (const { start, text } of textRuns(block.regions[region])) {
    for (const found of text.matchAll(pattern)) {
      if (found[0] === '') continue;
      const from = start + found.index;
      matches.push({ block: block.id, region, from, to: from + found[0].length });
    }
  }
  return matches;
}

/** A matcher for a search, or the message of a regular expression that cannot be read. */
export function blockMatcher(query: string, options: SearchOptions): BlockMatcher | { error: string } {
  if (query === '') return () => [];
  const pattern = findPattern({ ...options, query });
  if (!(pattern instanceof RegExp)) return pattern;
  const found = new WeakMap<EngineBlock, readonly FindMatch[]>();
  return (block) => {
    let matches = found.get(block);
    if (matches === undefined) {
      const regions = Object.keys(block.regions).sort(compareRegionNames);
      matches = regions.flatMap((region) => regionMatches(pattern, block, region));
      found.set(block, matches);
    }
    return matches;
  };
}

/**
 * Every match of `query` in the text regions of the document, in document order. Marks never break a match, and an atom
 * stands between matches: none spans one or takes one in. An empty query finds nothing, and zero-length matches are
 * skipped.
 */
export function findMatches(doc: EngineDoc, query: string, options: SearchOptions): FindResult {
  const matcher = blockMatcher(query, options);
  if (typeof matcher !== 'function') return matcher;
  return { matches: doc.blocks.flatMap((block) => matcher(block)) };
}
