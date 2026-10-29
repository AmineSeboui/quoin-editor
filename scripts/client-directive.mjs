const DIRECTIVE = /^['"]use client['"]/;

/**
 * The code and sourcemap of a client entry with 'use client' on a line of its own, where esbuild buries it behind the
 * CJS prelude. The one added generated line is an empty group at the start of the mappings, so every later line keeps
 * its source place.
 */
export function withClientDirective(code, map) {
  if (DIRECTIVE.test(code)) return { code, map };
  return { code: `'use client';\n${code}`, map: { ...map, mappings: `;${map.mappings}` } };
}
