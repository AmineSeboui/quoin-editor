import type * as Y from 'yjs';
import { coreExtensions, createEditor, insertText, undo, type Editor, type QuoinBlock } from '../../engine';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import { caret, range } from '../../engine/test-support/editor-fixtures';
import { yjsCollaboration } from '../../yjs/index';
import { linkedDocs } from '../../yjs/test-support/peers';
import { acceptAnswer } from './ai-accept';
import { aiExtension } from './ai-extension';
import { ask, openMenu } from './ai-flow';
import { aiState } from './ai-plugin';
import { targetOfSelection } from './ai-target';
import { fakeAiHost, nextFrame } from './ai-test-host';

function client(doc: Y.Doc, name: string, host: ReturnType<typeof fakeAiHost>, blocks: QuoinBlock[] = []) {
  const editor = createEditor({
    blocks,
    isMac: true,
    extensions: [
      ...coreExtensions(),
      collaborationExtension(yjsCollaboration({ doc, user: { name } })),
      aiExtension({ stream: host.stream }),
    ],
  });
  editor.mount();
  return editor;
}

const texts = (editor: Editor) => editor.getBlocks().map((block) => block.data.markdown);

describe('AI answers between collaborators', () => {
  it('follow edits from a collaborator while streaming, and reach them on Accept as a local change undone here', async () => {
    const { docs, flush } = linkedDocs();
    const host = fakeAiHost();
    const ada = client(docs[0], 'ada', host, [{ id: 'p', type: 'MARKDOWN', data: { markdown: 'say a word' } }]);
    flush();
    const bea = client(docs[1], 'bea', fakeAiHost());
    flush();
    ada.commands.setSelection(range('p', 4, 10));
    openMenu(ada, targetOfSelection(ada.state)!, false);
    ask(ada, host.stream, { action: 'improve' });
    host.last().push('one term');
    host.last().end();
    await nextFrame();
    bea.commands.setSelection(caret('p', 0));
    insertText('So ')(bea.state, (tr) => bea.dispatch(tr));
    flush();
    expect(texts(ada)).toEqual(['So say a word']);
    expect(aiState(bea.state).ghost).toBeNull();
    acceptAnswer(ada);
    flush();
    expect(texts(ada)).toEqual(['So say one term']);
    expect(texts(bea)).toEqual(['So say one term']);
    undo(ada.state, (tr) => ada.dispatch(tr));
    flush();
    expect(texts(bea)).toEqual(['So say a word']);
  });
});
