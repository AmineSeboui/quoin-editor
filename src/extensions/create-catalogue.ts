import type { Extension } from '../engine';

type Feature = (options?: never) => Extension;

type Features = Readonly<Record<string, Feature>>;

export type CatalogueOptionsOf<F extends Features> = { readonly [Name in keyof F]?: Parameters<F[Name]>[0] | false };

/** Builds every feature with the options given under its name, in order, and leaves out those set to `false`. */
export function createCatalogue<F extends Features>(features: F): (options?: CatalogueOptionsOf<F>) => Extension[] {
  return (options = {}) =>
    Object.entries(features).flatMap(([name, create]) => {
      const own = options[name as keyof F];
      return own === false ? [] : [(create as (options: unknown) => Extension)(own)];
    });
}
