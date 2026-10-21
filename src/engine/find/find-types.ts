export type SearchOptions = {
  readonly caseSensitive: boolean;
  /** Matches only where no letter, digit or underscore of any script touches either end. */
  readonly wholeWord: boolean;
  /** Reads the query as a regular expression, and the replacement's `$&` and `$1` to `$9` as its groups. */
  readonly regex: boolean;
};

export type FindQuery = SearchOptions & { readonly query: string };

/** A match within one text region of a block, `from` and `to` being offsets in that region. */
export type FindMatch = { readonly block: string; readonly region: string; readonly from: number; readonly to: number };

/** The matches in document order, or the reason a regular expression could not be read, which is never thrown. */
export type FindResult = { readonly matches: readonly FindMatch[] } | { readonly error: string };
