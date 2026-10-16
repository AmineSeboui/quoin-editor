import { useMemo } from 'react';
import type { Extension } from '../engine';
import type { QuoinLabels } from '../i18n/labels';
import { slashExtension } from '../menus/slash/slash-extension';
import type { AnyBlockDefinition } from '../registry';
import { collectUi, extensionUi } from './collect-ui';

/**
 * The UI the extensions contribute, and the slash extension built over their commands and the registered block types.
 * The editor reads its extensions once, when it is created, so it keeps the first slash extension; the menu drawn is
 * rebuilt with the labels and block types of each render, and reads the plugin the editor holds through its key.
 */
export function useExtensionUi(extensions: readonly Extension[], blockTypes: AnyBlockDefinition[], labels: QuoinLabels) {
  const ui = useMemo(() => collectUi(extensions, blockTypes), [extensions, blockTypes]);
  const slash = useMemo(() => slashExtension(labels, ui.slashItems), [labels, ui.slashItems]);
  const overlays = useMemo(() => [...(extensionUi(slash).overlays ?? []), ...ui.overlays], [slash, ui.overlays]);
  return { ui, slash, overlays };
}
