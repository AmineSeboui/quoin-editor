import type { Command } from './command';
import { insertText } from './insert-text';

export const insertHardBreak: Command = insertText('\n', { origin: 'command' });
