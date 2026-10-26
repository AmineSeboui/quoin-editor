import { useRef, type CSSProperties } from 'react';
import { getPluginState, type EditorState } from '../../engine';
import { sameValue } from '../../engine/model/same-value';
import { useEditorState, type ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
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
    const view = root?.ownerDocument.defaultView;
    if (!root || !view || box.current === null) return undefined;
    const carets = Array.from(box.current.children) as HTMLElement[];
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    // The text can move with no change of the editor's: a scroller inside the canvas scrolls, a host reflows as a font
    // arrives, or the canvas is resized. A scroll places the carets at once, in the frame it is drawn.
    const observer = new ResizeObserver(later);
    const update = () => carets.forEach((caret) => placeCaret(controller, root, caret, observer));
    update();
    observer.observe(root);
    const unsubscribe = controller.editor.subscribe(later);
    const fonts = root.ownerDocument.fonts;
    root.addEventListener('scroll', update, { capture: true, passive: true });
    fonts?.addEventListener('loadingdone', later);
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
      root.removeEventListener('scroll', update, { capture: true });
      fonts?.removeEventListener('loadingdone', later);
    };
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
