/** A whole number above zero as it is, and anything else, missing or malformed, as 0. */
export const countOf = (value: unknown): number => (Number.isInteger(value) && (value as number) > 0 ? (value as number) : 0);
