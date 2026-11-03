import { lazyLoad } from '../../../lazy-load';
import type { Tokenize } from './prism-highlight';

type PrismGlobal = { Prism?: unknown };

/**
 * Loads the grammars, with the global Prism the chunk reads and writes borrowed for as long as that takes.
 *
 * Prism reads `Prism.manual` off the global as it loads and otherwise highlights every element of the host's page
 * carrying a language class, so the flag has to be there before the chunk is imported, not after. Prism then writes
 * itself to the global, which would replace a copy the host keeps there, so whatever was there is put back once the
 * chunk holds its own reference.
 */
async function importTokenize(): Promise<Tokenize> {
  const globals = globalThis as PrismGlobal;
  const theirs = globals.Prism;
  globals.Prism = { manual: true };
  try {
    const { tokenize } = await import('./prism-grammars');
    return tokenize;
  } finally {
    if (theirs === undefined) delete globals.Prism;
    else globals.Prism = theirs;
  }
}

/** The Prism grammars, loaded on demand the first time a canvas with highlighting mounts. */
export const prismSource = lazyLoad(importTokenize);
