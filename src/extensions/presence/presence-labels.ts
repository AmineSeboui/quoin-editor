/** Every string presence shows or speaks. Names come as a list of the people meant, in the order they came. */
export type PresenceLabels = {
  /** Said through the live region when people open the document. */
  joined(names: readonly string[]): string;
  /** Said when people close it. */
  left(names: readonly string[]): string;
  /** The accessible name of the avatars beside a block, naming the people whose selection is in it. */
  here(names: readonly string[]): string;
  /** The text a collaborator's caret shows, given the name the collaborator gave. */
  caret(name: string): string;
};

const list = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export const englishPresenceLabels: PresenceLabels = {
  joined: (names) => `${list(names)} joined`,
  left: (names) => `${list(names)} left`,
  here: (names) => `${list(names)} ${names.length === 1 ? 'is' : 'are'} here`,
  caret: (name) => name,
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolvePresenceLabels(overrides?: Partial<PresenceLabels>): PresenceLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishPresenceLabels : { ...englishPresenceLabels, ...Object.fromEntries(given) };
}
