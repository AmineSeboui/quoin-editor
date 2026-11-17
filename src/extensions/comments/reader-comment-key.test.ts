import type { KeyLike } from '../../engine/extension/keymap';
import { isReaderCommentKey } from './reader-comment-key';

const key = (key: string, held: Partial<KeyLike> = {}): KeyLike => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...held,
});

const commentOnMac = key('µ', { code: 'KeyM', altKey: true, metaKey: true });
const commentElsewhere = key('m', { code: 'KeyM', altKey: true, ctrlKey: true });

const commenting = { readOnly: true, canCommentWhileReadOnly: true };

describe("the reader's Comment key", () => {
  it('is Mod+Alt+M on a read-only canvas whose reader may comment, whatever character Alt makes of M', () => {
    expect(isReaderCommentKey(commenting, commentOnMac, true)).toBe(true);
    expect(isReaderCommentKey(commenting, commentElsewhere, false)).toBe(true);
  });

  it('is no key on a read-only canvas without the option, which takes no key to comment', () => {
    const readOnly = { readOnly: true, canCommentWhileReadOnly: false };
    expect(isReaderCommentKey(readOnly, commentOnMac, true)).toBe(false);
    expect(isReaderCommentKey(readOnly, commentElsewhere, false)).toBe(false);
  });

  it('is no key on an editable canvas, whose keymap answers Mod+Alt+M', () => {
    for (const canCommentWhileReadOnly of [true, false]) {
      expect(isReaderCommentKey({ readOnly: false, canCommentWhileReadOnly }, commentOnMac, true)).toBe(false);
    }
  });

  it('is no other key, so formatting, history and the block menu stay shut to the reader', () => {
    const others = [
      key('b', { metaKey: true }),
      key('z', { metaKey: true }),
      key('/', { metaKey: true }),
      key('m', { code: 'KeyM', metaKey: true }),
      key('M', { code: 'KeyM', altKey: true, metaKey: true, shiftKey: true }),
      key('m'),
    ];
    for (const event of others) expect(isReaderCommentKey(commenting, event, true)).toBe(false);
    expect(isReaderCommentKey(commenting, commentElsewhere, true)).toBe(false);
  });
});
