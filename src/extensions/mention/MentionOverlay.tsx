'use client';

import type { ViewController } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { useSelectionOutOfAtoms } from '../atoms/use-selection-out-of-atoms';
import { MENTION_ATOMS, type MentionFeature } from './mention-feature';
import { MentionMenu } from './MentionMenu';
import { useMentionOpening } from './use-mention-opening';
import { useReadOnlyChips } from './use-read-only-chips';

/** What the feature draws over a canvas: the `@` menu when the host can search, and the opening of chips. */
export function MentionOverlay({ controller, feature }: { controller: ViewController; feature: MentionFeature }) {
  const readOnly = useReadOnly(controller);
  useMentionOpening(controller, feature.onOpen, !readOnly);
  useReadOnlyChips(controller, feature.onOpen, readOnly);
  useSelectionOutOfAtoms(controller, MENTION_ATOMS, !readOnly);
  if (feature.search === undefined) return null;
  return <MentionMenu controller={controller} labels={feature.labels} search={feature.search} />;
}
