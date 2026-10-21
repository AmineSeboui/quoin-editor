export type Person = { readonly client: number; readonly name: string };
export type PeopleChange = {
  readonly joined: readonly Person[];
  readonly left: readonly Person[];
};

/**
 * What presence knows of one editor across its mounts: whether its view is focused and editable, the session of the
 * current mount, and who hears of people joining and leaving.
 */
export type PresenceLink = {
  active: boolean;
  session: { activeChanged(): void } | null;
  readonly listeners: Set<(change: PeopleChange) => void>;
};

const links = new WeakMap<object, PresenceLink>();

export function linkOf(editor: object): PresenceLink {
  let link = links.get(editor);
  if (link === undefined) {
    link = { active: false, session: null, listeners: new Set() };
    links.set(editor, link);
  }
  return link;
}

export function setActive(link: PresenceLink, active: boolean): void {
  if (link.active === active) return;
  link.active = active;
  link.session?.activeChanged();
}
