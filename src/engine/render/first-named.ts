/** The first of the names that is neither empty nor only white space. */
export const firstNamed = (...names: (string | undefined)[]): string => names.find((name) => name?.trim()) ?? '';
