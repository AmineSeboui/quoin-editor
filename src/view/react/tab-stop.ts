import type { Selection } from '../../engine';

// Every other host and shell stays out of the tab order, so Tab from a selected block leaves the editor.
export function isTabStop(selection: Selection | null, block: string, region: string | null): boolean {
  switch (selection?.kind) {
    case 'text':
      return selection.head.block === block && selection.head.region === region;
    case 'node':
      return region === null && selection.block === block;
    case 'blocks':
      return region === null && selection.head === block;
    default:
      return false;
  }
}
