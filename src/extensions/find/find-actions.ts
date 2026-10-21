import { getPluginState, textSelection, type Transaction } from '../../engine';
import type { SearchOptions } from '../../engine/find/find-types';
import type { ViewController } from '../../view';
import { closeFind, replaceAll, replaceCurrent, setSearch, stepFind } from './find-commands';
import { findKey } from './find-plugin';
import { currentMatch } from './find-state';

export type FindActions = {
  search(query: string): void;
  toggle(option: keyof SearchOptions): void;
  step(by: 1 | -1): void;
  replace(replacement: string): void;
  replaceAll(replacement: string): void;
  close(): void;
};

// Each action reads the search as it is when it runs. Every write but the closing one goes to the editor alone, so that it
// never pulls focus from the panel into the canvas.
export function findActions(controller: ViewController): FindActions {
  const { editor } = controller;
  const write = (tr: Transaction) => editor.dispatch(tr);
  const current = () => getPluginState(editor.state, findKey);
  return {
    search: (query) => write(setSearch(editor.state, { ...current().search, query })),
    toggle(option) {
      const { search } = current();
      write(setSearch(editor.state, { ...search, [option]: !search[option] }));
    },
    step: (by) => write(stepFind(editor.state, by)),
    replace: (replacement) => void replaceCurrent(replacement)(editor.state, write),
    replaceAll: (replacement) => void replaceAll(replacement)(editor.state, write),
    close() {
      const match = currentMatch(current());
      const tr = closeFind(editor.state);
      if (match !== null) {
        const { block, region, from, to } = match;
        tr.setSelection(textSelection({ block, region, offset: from }, { block, region, offset: to }));
      }
      controller.dispatch(tr);
      controller.focus();
    },
  };
}
