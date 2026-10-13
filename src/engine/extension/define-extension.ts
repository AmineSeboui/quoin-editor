import type { Extension } from './types';

export function defineExtension<E extends Extension>(extension: E): E {
  if (typeof extension.name !== 'string' || extension.name === '') throw new Error('an extension needs a name');
  return extension;
}
