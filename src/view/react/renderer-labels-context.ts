import { createContext, useContext } from 'react';
import { englishRendererLabels, type RendererLabels } from './renderer-labels';

export const RendererLabelsContext = createContext(englishRendererLabels);

export const useRendererLabels = (): RendererLabels => useContext(RendererLabelsContext);
