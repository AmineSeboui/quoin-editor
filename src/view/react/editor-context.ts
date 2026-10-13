import { createContext, useContext } from 'react';
import type { ViewController } from '../controller/view-controller';

export const QuoinEditorContext = createContext<ViewController | null>(null);

export function useViewController(): ViewController {
  const controller = useContext(QuoinEditorContext);
  if (controller === null) throw new Error('useViewController must be called inside an EditorView');
  return controller;
}
