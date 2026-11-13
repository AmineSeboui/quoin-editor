import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { createPluginKey, defineExtension } from '../../engine';
import { mountTypingCanvas } from '../../extensions/typing-test-canvas';
import type { ViewController } from '../../view';
import { suggestionPlugin, type SuggestionState } from './suggestion-plugin';
import { SuggestionMenu } from './SuggestionMenu';

const tagKey = createPluginKey<SuggestionState>('tags');
const TAGS = ['red', 'green', 'blue'] as const;

const findTags = (query: string) => TAGS.filter((tag) => tag.includes(query));
const tagOf = (tag: string) => tag;
const tagCount = (count: number) => `${count} tags`;

function tagsExtension(onSelect: (tag: string) => void) {
  function TagMenu({ controller }: { controller: ViewController }) {
    return (
      <SuggestionMenu
        controller={controller}
        pluginKey={tagKey}
        items={findTags}
        itemKey={tagOf}
        renderItem={tagOf}
        onSelect={onSelect}
        label="Tags"
        emptyLabel="No tags"
        countLabel={tagCount}
      />
    );
  }
  return defineExtension({
    name: 'tags',
    plugins: [suggestionPlugin(tagKey, { char: '%' })],
    ui: { overlays: [TagMenu] },
  });
}

function mountTags(onSelect: (tag: string) => void = () => {}, onError = vi.fn()) {
  const canvas = mountTypingCanvas([{ id: 'a', type: 'MARKDOWN', data: { markdown: '' } }], {
    extensions: [tagsExtension(onSelect)],
    onError,
  });
  canvas.caret('a', 0);
  return { ...canvas, onError };
}

describe('a suggestion menu', () => {
  it('words the number of its results in its own terms', async () => {
    const canvas = mountTags();
    canvas.type('%');
    await waitFor(() => expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('3 tags'));
  });

  it('reports an item that throws when chosen with Enter, and keeps the key from the text', () => {
    const failure = new Error('the tag could not be written');
    const { type, host, markdown, onError } = mountTags(() => {
      throw failure;
    });
    type('%gr');
    let reachedText = true;
    act(() => {
      reachedText = fireEvent.keyDown(host('a'), { key: 'Enter' });
    });
    expect(reachedText).toBe(false);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(markdown('a')).toBe('%gr');
  });
});
