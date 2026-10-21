import type { Selection } from '../../engine';
import type { ViewController } from './view-controller';

export const dispatchSelection = (controller: ViewController, selection: Selection): void =>
  controller.dispatch(controller.editor.createTransaction().setSelection(selection));
