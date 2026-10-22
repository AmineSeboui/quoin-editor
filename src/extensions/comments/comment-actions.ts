import { toError } from '../../to-error';
import { threadRemoval } from './comment-anchors';
import type { CommentsEditor, CommentsLink } from './comments-link';
import { COMMENTS, type CommentsAction } from './comments-plugin';

async function called(link: CommentsLink, call: () => Promise<void>): Promise<boolean> {
  try {
    await call();
    return true;
  } catch (error) {
    link.report(toError(error));
    return false;
  }
}

/**
 * Resolves or deletes a thread through the host, then takes its marks off in one undo step and closes it. Undo puts
 * the marks back; the host's thread stays as the host left it. A failure leaves the document as it was.
 */
export async function endThread(
  editor: CommentsEditor,
  link: CommentsLink,
  call: (threadId: string) => Promise<void>,
  id: string,
): Promise<boolean> {
  if (!(await called(link, () => call(id))) || link.mounts === 0) return false;
  const action: CommentsAction = { type: 'forget', id };
  editor.dispatch(threadRemoval(editor.state, id).setMeta(COMMENTS, action));
  return true;
}

export function sendReply(
  link: CommentsLink,
  call: (threadId: string, body: string) => Promise<void>,
  id: string,
  body: string,
): Promise<boolean> {
  return called(link, () => call(id, body));
}
