'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { aiExtension, type AiOptions } from './extensions/ai/ai-extension';
export { englishAiLabels, type AiLabels } from './extensions/ai/ai-labels';
export type { AiAction, AiRequest, AiStream } from './extensions/ai/ai-actions';
