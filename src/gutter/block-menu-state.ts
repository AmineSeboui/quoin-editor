import { handleTargets, styleTargets } from '../canvas/block-targets';
import type { CanvasUiStore } from '../canvas/ui-store';
import type { EditorState } from '../engine';

const targetsOf = (state: EditorState, blockId: string) => ({
  blockIds: handleTargets(state, blockId),
  styleIds: styleTargets(state, blockId),
});

export function openBlockMenu(store: CanvasUiStore, state: EditorState, blockId: string): void {
  store.set({ hoveredBlock: blockId, blockMenu: { ...targetsOf(state, blockId), anchor: 'handle' } });
}

export function openBlockMenuAt(store: CanvasUiStore, state: EditorState, blockId: string, x: number, y: number): void {
  store.set({ blockMenu: { ...targetsOf(state, blockId), anchor: 'pointer', x, y } });
}

export function closeBlockMenu(store: CanvasUiStore): void {
  store.set({ blockMenu: null, hoveredBlock: null });
}
