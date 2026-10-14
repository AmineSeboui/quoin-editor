import type { EditorState, Inline } from '../../engine';
import { blockById } from '../../engine/model/doc';

export function regionInline(state: EditorState, block: string, region: string): Inline | undefined {
  const regions = blockById(state.doc, block)?.regions;
  return regions && Object.hasOwn(regions, region) ? regions[region] : undefined;
}
