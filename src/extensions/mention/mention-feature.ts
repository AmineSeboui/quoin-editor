import type { AtomNode } from '../../engine';
import type { MentionLabels } from './mention-labels';

/** The atom types the feature draws, opens and selects whole. */
export const MENTION_ATOMS: readonly string[] = ['mention'];

/** A mention as the document keeps it, and as `onOpen` receives it. */
export type Mention = { id: string; label: string; kind?: string };

/** The mention a mention atom holds. */
export function mentionOf({ attrs: { id = '', label = '', kind } }: AtomNode): Mention {
  return kind === undefined ? { id, label } : { id, label, kind };
}

/** What the host's search finds: a mention, with what the menu shows of it besides its label. */
export type MentionResult = Mention & {
  description?: string;
  /** Drawn only from an http or https address. */
  avatarUrl?: string;
};

/** Finds what to mention for the text typed after `@`. */
export type MentionSearch = (query: string) => Promise<readonly MentionResult[]>;

/** The options of one mention extension, resolved once, shared by its menu and its chips. */
export type MentionFeature = {
  readonly labels: MentionLabels;
  readonly search: MentionSearch | undefined;
  readonly onOpen: ((mention: Mention) => void) | undefined;
};
