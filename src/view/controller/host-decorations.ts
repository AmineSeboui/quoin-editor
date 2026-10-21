import type { Decoration, Editor, EditorState } from '../../engine';
import { sameAttrs } from '../../engine/model/attrs';
import { selectionDecorations, type PaintMode } from '../selection/selection-decorations';
import { hostKey } from './host-registry';

export const NO_DECORATIONS: readonly Decoration[] = [];

// A block decoration goes under its block with an empty region, which no host has.
export function decorationsByHost(decorations: readonly Decoration[]): ReadonlyMap<string, readonly Decoration[]> {
  const byHost = new Map<string, Decoration[]>();
  for (const decoration of decorations) {
    const key = hostKey(decoration.block, decoration.kind === 'block' ? '' : decoration.region);
    const group = byHost.get(key);
    if (group) group.push(decoration);
    else byHost.set(key, [decoration]);
  }
  return byHost;
}

function sameDecoration(a: Decoration, b: Decoration): boolean {
  if (a.kind !== b.kind || a.block !== b.block || !sameAttrs(a.attrs, b.attrs)) return false;
  if (a.kind === 'inline' && b.kind === 'inline') {
    return a.region === b.region && a.from === b.from && a.to === b.to;
  }
  if (a.kind === 'widget' && b.kind === 'widget') {
    const samePlace = a.region === b.region && a.offset === b.offset && a.side === b.side;
    return samePlace && a.key === b.key && a.widget === b.widget;
  }
  return true;
}

export function sameDecorations(a: readonly Decoration[], b: readonly Decoration[]): boolean {
  return a === b || (a.length === b.length && a.every((decoration, index) => sameDecoration(decoration, b[index])));
}

type Grouped = WeakMap<EditorState, ReadonlyMap<string, readonly Decoration[]>>;

const byMode: Readonly<Record<PaintMode, Grouped>> = { highlight: new WeakMap(), decorations: new WeakMap() };

// A state belongs to one editor, so the decorations grouped from it are computed once however many hosts ask.
export function hostDecorations(
  editor: Editor,
  block: string,
  region: string,
  mode: PaintMode = 'highlight',
): readonly Decoration[] {
  const { state } = editor;
  const byState = byMode[mode];
  let grouped = byState.get(state);
  if (grouped === undefined) {
    grouped = decorationsByHost([...editor.decorations(), ...selectionDecorations(state, mode)]);
    byState.set(state, grouped);
  }
  return grouped.get(hostKey(block, region)) ?? NO_DECORATIONS;
}
