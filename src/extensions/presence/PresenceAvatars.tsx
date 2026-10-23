import { useRef, type CSSProperties } from 'react';
import { getPluginState, type EditorState, type Selection } from '../../engine';
import { useEditorState, type ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import type { PresenceLabels } from './presence-labels';
import { presenceKey, type Peer } from './presence-plugin';

const headBlock = (selection: Selection): string =>
  selection.kind === 'node' ? selection.block : selection.kind === 'blocks' ? selection.head : selection.head.block;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('');

type Group = readonly [block: string, people: readonly Pick<Peer, 'client' | 'name' | 'color'>[]];

// The people in each block, which stay the same while their carets move within it.
function groupsOf(state: EditorState): readonly Group[] {
  const byBlock = new Map<string, Pick<Peer, 'client' | 'name' | 'color'>[]>();
  for (const { client, name, color, selection } of getPluginState(state, presenceKey)) {
    if (selection === null) continue;
    const block = headBlock(selection);
    byBlock.set(block, [...(byBlock.get(block) ?? []), { client, name, color }]);
  }
  return [...byBlock];
}

const sameGroups = (a: readonly Group[], b: readonly Group[]) => JSON.stringify(a) === JSON.stringify(b);

function place(controller: ViewController, root: HTMLElement, group: HTMLElement): void {
  const shell = controller.blockElement(group.dataset.block ?? '');
  group.style.visibility = shell === undefined ? 'hidden' : '';
  if (shell === undefined) return;
  const top = shell.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop + root.scrollTop;
  group.style.transform = `translateY(${top}px)`;
}

/** Avatars at the end of the first line of each block someone else's selection is in, named for screen readers. */
export function PresenceAvatars({ controller, labels }: { controller: ViewController; labels: PresenceLabels }) {
  const groups = useEditorState(controller, groupsOf, sameGroups);
  const box = useRef<HTMLDivElement>(null);

  // Placed in place rather than through React state, as the gutter is, once the frame's edits have reached the blocks.
  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    const view = root?.ownerDocument.defaultView;
    if (!root || !view || box.current === null) return undefined;
    const children = Array.from(box.current.children) as HTMLElement[];
    const update = () => children.forEach((group) => place(controller, root, group));
    update();
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    const unsubscribe = controller.editor.subscribe(later);
    const observer = new ResizeObserver(later);
    observer.observe(root);
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
    };
  }, [controller, groups]);

  return (
    <div ref={box} className="quoin-presence-avatars">
      {groups.map(([block, people]) => (
        <div
          key={block}
          data-block={block}
          role="img"
          aria-label={labels.here(people.map(({ name }) => name))}
          className="quoin-presence-group"
        >
          {people.map(({ client, name, color }) => (
            <span
              key={client}
              className="quoin-presence-avatar"
              style={color === undefined ? undefined : ({ '--quoin-presence': color } as CSSProperties)}
            >
              {initials(name)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
