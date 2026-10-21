import { expect, it } from 'vitest';
import * as collab from './index';

it('exports the collaboration hook for the yjs entry to publish', () => {
  expect(Object.keys(collab).sort()).toEqual(['applyRemote', 'collaborationExtension']);
});
