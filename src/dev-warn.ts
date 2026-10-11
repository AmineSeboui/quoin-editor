// Bundlers replace `process.env.NODE_ENV` at build time. Declared locally rather than
// pulled in from @types/node, because nothing else here needs a Node environment, and
// guarded with `typeof` so a runtime that defines no `process` still works.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

const seen = new Set<string>();

/** Warns the developer once per distinct message, and never in a production build. */
export function devWarn(message: string): void {
  if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') return;
  if (seen.has(message)) return;
  seen.add(message);
  console.warn(`Quoin: ${message}`);
}

/** Lets a test observe the warning again; nothing in the package calls it. */
export function resetDevWarnings(): void {
  seen.clear();
}
