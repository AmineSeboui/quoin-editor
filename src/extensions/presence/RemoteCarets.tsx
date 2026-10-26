import { useRef, type CSSProperties } from 'react';
import { getPluginState, type EditorState } from '../../engine';
import { sameValue } from '../../engine/model/same-value';
import { useEditorState, type ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { followLayout } from './follow-layout';
import { placeCaret } from './place-caret';
import type { PresenceLabels } from './presence-labels';
import { presenceKey, type Peer } from './presence-plugin';

type Shown = Pick<Peer, 'client' | 'name' | 'color' | 'idle'>;

const shownOf = (state: EditorState): readonly Shown[] =>
  getPluginState(state, presenceKey).flatMap(({ client, name, color, idle, selection }) =>
    selection?.kind === 'text' ? [{ client, name, color, idle }] : [],
  );

/**
 * Each collaborator's caret, a line in their colour with their name, drawn over the text rather than in it, so it
 * changes nothing of the caret's moves, the selection, composition or copying. Hidden from assistive technology.
 */
export function RemoteCarets({ controller, labels }: { controller: ViewController; labels: PresenceLabels }) {
  const shown = useEditorState(controller, shownOf, sameValue);
  const box = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    if (!root || box.current === null) return undefined;
    const carets = Array.from(box.current.children) as HTMLElement[];
    return followLayout(controller, root, (observer) => carets.forEach((caret) => placeCaret(controller, root, caret, observer)));
  }, [controller, shown]);

  return (
    <div ref={box} className="quoin-presence-carets" aria-hidden="true">
      {shown.map(({ client, name, color, idle }) => (
        <div
          key={client}
          data-client={client}
          data-idle={idle ? '' : undefined}
          className="quoin-presence-caret"
          style={color === undefined ? undefined : ({ '--quoin-presence': color } as CSSProperties)}
        >
          <span className="quoin-presence-name">{labels.caret(name)}</span>
        </div>
      ))}
    </div>
  );
}
