import { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import {
  BlockCanvas,
  coreBlocks,
  defineBlock,
  defineExtension,
  replaceInlineStep,
  text,
  textSelection,
  Transaction,
  useAutosave,
  type AnyBlockDefinition,
  type BlockEditorProps,
  type Command,
  type ExtensionUI,
  type QuoinBlock,
  type QuoinEditorHandle,
  type QuoinLabels,
  type UploadFn,
} from 'quoin-editor';
import { EditorView, useQuoinEditor } from 'quoin-editor/headless';
import 'quoin-editor/styles.css';

type RatingData = { stars: number };

function RatingEditor({ data, onChange }: BlockEditorProps<RatingData>) {
  return <button type="button" onClick={() => onChange({ stars: data.stars + 1 })}>{data.stars}</button>;
}

const rating = defineBlock({
  type: 'RATING',
  label: 'Rating',
  icon: Star,
  editor: RatingEditor,
  initialData: () => ({ stars: 0 }),
});

const blockTypes: AnyBlockDefinition[] = [...coreBlocks, rating];

const upload: UploadFn = async (file) => ({ storageKey: file.name, filename: file.name, size: file.size });

const french: Partial<QuoinLabels> = { bold: 'Gras', heading: (level) => `Titre ${level}` };

const insertToday: Command = (state, dispatch) => {
  if (state.selection?.kind !== 'text') return false;
  const { block, region, offset } = state.selection.head;
  const today = new Date().toDateString();
  const tr = new Transaction(state).step(replaceInlineStep(block, region, offset, offset, [text(today)]));
  dispatch?.(tr.setSelection(textSelection({ block, region, offset: offset + today.length })));
  return true;
};

const datesUi: ExtensionUI = {
  slashItems: [
    { id: 'today', title: 'Today', group: 'basic', icon: Star, keywords: ['date'], command: () => insertToday },
    { id: 'calendar', title: 'Calendar', group: 'basic', run: ({ controller }) => controller.focus('end') },
  ],
};

const extensions = [defineExtension({ name: 'dates', ui: datesUi })];

export function Consumer() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  const editor = useRef<QuoinEditorHandle>(null);
  useAutosave({ deps: [blocks], build: () => blocks, save: () => {} });
  return (
    <BlockCanvas
      ref={editor}
      blocks={blocks}
      onChange={setBlocks}
      blockTypes={blockTypes}
      upload={upload}
      labels={french}
      extensions={extensions}
    />
  );
}

export const exportMarkdown = (handle: QuoinEditorHandle): string => handle.toMarkdown({ comments: true });

export function HeadlessConsumer() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>([]);
  const controller = useQuoinEditor({ blocks, onChange: setBlocks });
  return <EditorView controller={controller} aria-label="Notes" />;
}
