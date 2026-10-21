'use client';

import { defineExtension, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { findDecorations } from './find-decorations';
import { resolveFindLabels, type FindLabels } from './find-labels';
import { findPlugin } from './find-plugin';
import { FindOverlay } from './FindOverlay';

export type FindOptions = {
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<FindLabels>;
};

/**
 * Find and replace: Mod+Shift+F opens a panel that marks every match of its query in the text of the document, steps
 * through them, and replaces the current one or all of them. A read-only canvas finds without replacing.
 */
export function findExtension(options: FindOptions = {}): Extension {
  const labels = resolveFindLabels(options.labels);
  const Overlay = ({ controller }: { controller: ViewController }) => (
    <FindOverlay controller={controller} labels={labels} />
  );
  const ui: ExtensionUI = { overlays: [Overlay] };
  return defineExtension({ name: 'find', plugins: [findPlugin], decorations: findDecorations, ui });
}
