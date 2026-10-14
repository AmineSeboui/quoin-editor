import type { Pos, Transaction } from '../../engine';
import { inlineText } from '../../engine/model/inline';
import type { ViewController } from '../controller/view-controller';
import { regionInline } from '../controller/region-inline';
import { readDomText } from '../dom/read-dom-text';
import { textDiff } from '../dom/text-diff';
import { replaceRange } from './replace-range';

export type CompositionSnapshot = {
  // Applies what was composed and draws the host again; false when nothing was composed or the host is gone.
  settle(): boolean;
  release(): void;
};

function composedEnd(controller: ViewController, block: string, region: string): number | undefined {
  const { selection } = controller.editor.state;
  if (selection?.kind !== 'text') return undefined;
  const ends = [selection.anchor, selection.head];
  if (ends.some((pos) => pos.block !== block || pos.region !== region)) return undefined;
  return Math.max(...ends.map((pos) => pos.offset));
}

// The composing host is not drawn, so a change the model takes meanwhile, from the page's blocks for example, never
// reaches its DOM. The composed text is what the DOM gained over the text at compositionstart, and it goes where the
// changes made since moved that place.
export function snapshotComposition(
  controller: ViewController,
  block: string,
  region: string,
): CompositionSnapshot | null {
  const { editor } = controller;
  const element = controller.registry.get(block, region);
  const inline = regionInline(editor.state, block, region);
  if (element === undefined || inline === undefined) return null;
  const text = inlineText(inline);
  const end = composedEnd(controller, block, region);
  const since: Transaction[] = [];
  const release = editor.subscribe((_, tr) => void (tr && since.push(tr)));
  const mapped = (offset: number, assoc: -1 | 1): Pos =>
    since.reduce((pos, tr) => tr.mapPos(pos, assoc), { block, region, offset });

  return {
    settle() {
      release();
      if (controller.registry.get(block, region) !== element) return false;
      const after = readDomText(element);
      const edit = textDiff(text, after, end === undefined ? undefined : end + after.length - text.length);
      if (edit === null) return false;
      const from = mapped(edit.from, edit.from === edit.to ? -1 : 1);
      const to = mapped(edit.to, -1);
      const spans = to.block === from.block && to.region === from.region && to.offset > from.offset;
      const range = { from, to: spans ? to : from };
      controller.edit(() => {
        const applied = replaceRange(editor, range, edit.insert, true);
        controller.renderHost(block, region);
        return applied;
      });
      return true;
    },
    release,
  };
}
