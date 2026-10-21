import { devWarn } from '../../dev-warn';
import type { EmbedProvider } from '../../engine';
import { embedSource } from '../../engine/render/embed-provider';
import { coreEmbedProviders } from '../../engine/render/embed-providers';

export type EmbedMatch = { readonly provider: string; readonly src: string };

function frameOf(url: string, provider: EmbedProvider): string | null {
  try {
    return embedSource(url, [provider]);
  } catch {
    devWarn(`the embed provider "${provider.name}" threw, so it frames nothing.`);
    return null;
  }
}

/**
 * The https frame of a page and the provider that frames it: the host's providers first, then the built-in ones, in the
 * order `toHTML` tries them. Null when none does.
 */
export function matchEmbed(url: string, hostProviders: readonly EmbedProvider[] = []): EmbedMatch | null {
  for (const provider of [...hostProviders, ...coreEmbedProviders]) {
    const src = frameOf(url, provider);
    if (src !== null) return { provider: provider.name, src };
  }
  return null;
}
