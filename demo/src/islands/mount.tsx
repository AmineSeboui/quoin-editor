import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { islands, type IslandName } from './registry';

/** Replaces the static copy an island was prerendered with by its live editor. */
export async function mountIsland(element: HTMLElement): Promise<void> {
  const load = islands[element.dataset.island as IslandName];
  if (!load) throw new Error(`no island named ${element.dataset.island}`);
  const { default: Live } = await load();
  createRoot(element).render(
    <StrictMode>
      <Live />
    </StrictMode>,
  );
}
