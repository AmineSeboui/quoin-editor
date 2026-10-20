'use client';

import * as React from 'react';
import { englishLabels } from './i18n/english-labels';
import type { QuoinLabels } from './i18n/labels';
import type { AnyBlockDefinition } from './registry';
import type { UploadFn } from './types';
import type { ViewController } from './view';

/** The resolved canvas configuration every block editor reads through `useQuoin`. */
export type QuoinConfig = {
  blockTypes: AnyBlockDefinition[];
  /** Absent when the host has not wired uploads; upload fields then render disabled. */
  upload?: UploadFn;
  resolveAssetUrl: (storageKey: string) => string;
  onError: (error: Error) => void;
  /** The controller of the canvas the block is drawn in; null under a provider no canvas set up. */
  controller: ViewController | null;
  labels: QuoinLabels;
};

/** What a host passes to `QuoinProvider`: only the block types are required. */
export type QuoinConfigInput = Partial<QuoinConfig> & {
  blockTypes: AnyBlockDefinition[];
};

const QuoinContext = React.createContext<QuoinConfig | null>(null);

/** Supplies the block registry, the host couplings (upload, asset URLs, error reporting), the canvas controller and the labels to every block below it. */
export function QuoinProvider({
  value,
  children,
}: {
  value: QuoinConfigInput;
  children: React.ReactNode;
}) {
  const { blockTypes, upload, resolveAssetUrl, onError, controller = null, labels = englishLabels } = value;
  const config = React.useMemo<QuoinConfig>(
    () => ({
      blockTypes,
      upload,
      // Identity default: an empty key resolves to an empty string, which stays falsy
      // wherever a resolved URL is tested for "no asset chosen yet".
      resolveAssetUrl: resolveAssetUrl ?? ((key: string) => key),
      onError: onError ?? ((error: Error) => console.error(error)),
      controller,
      labels,
    }),
    [blockTypes, upload, resolveAssetUrl, onError, controller, labels],
  );
  return <QuoinContext.Provider value={config}>{children}</QuoinContext.Provider>;
}

/** Reads the canvas configuration. Throws outside a QuoinProvider rather than returning a silent default. */
export function useQuoin(): QuoinConfig {
  const config = React.useContext(QuoinContext);
  if (!config) throw new Error('useQuoin must be used inside a QuoinProvider.');
  return config;
}
