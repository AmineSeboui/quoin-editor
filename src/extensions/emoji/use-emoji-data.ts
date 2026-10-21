'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuoin } from '../../context';
import { toError } from '../../to-error';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { emojiData, type EmojiData } from './emoji-data';

export type EmojiDataState = EmojiData | 'loading' | 'failed';

/**
 * The emoji dataset, loading it when the component mounts unless it has loaded already. A load that fails reaches
 * `onError` and is tried again by the next component that mounts.
 */
export function useEmojiData(): EmojiDataState {
  const { onError } = useQuoin();
  const report = useRef(onError);
  useIsomorphicLayoutEffect(() => {
    report.current = onError;
  });
  const [state, setState] = useState<EmojiDataState>(() => emojiData.loaded() ?? 'loading');
  useEffect(() => {
    let current = true;
    emojiData.load().then(
      (data) => {
        if (current) setState(data);
      },
      (reason: unknown) => {
        if (!current) return;
        setState('failed');
        report.current(toError(reason));
      },
    );
    return () => {
      current = false;
    };
  }, []);
  return state;
}
