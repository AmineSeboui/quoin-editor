import type { AtomSpec } from './types';

const mention: AtomSpec = { type: 'mention', plainText: ({ label }) => `@${label}` };

const math: AtomSpec = { type: 'math', plainText: ({ latex }) => latex };

export const coreAtomSpecs: AtomSpec[] = [mention, math];
