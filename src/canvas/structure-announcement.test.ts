import { createEditor } from '../engine';
import { englishLabels } from '../i18n/english-labels';
import { blockMovedMessage } from './structure-announcement';

describe('blockMovedMessage', () => {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } }] });

  it('says where a block of the document is', () => {
    expect(blockMovedMessage(editor.state.doc, 'a', englishLabels)).toBe('Block moved to position 1 of 1');
  });

  it('says nothing of a block the document no longer holds, rather than a first place it is not in', () => {
    expect(blockMovedMessage(editor.state.doc, 'gone', englishLabels)).toBeNull();
  });
});
