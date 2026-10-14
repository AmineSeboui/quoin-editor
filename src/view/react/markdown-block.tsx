import type { BlockRenderProps, BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { orderedNumber } from './list-numbers';
import { TaskCheckbox } from './TaskCheckbox';
import { useEditorState } from './use-editor-state';

const REGION = 'text';

function headingLevel(level: unknown): number {
  return typeof level === 'number' && Number.isInteger(level) ? Math.min(6, Math.max(1, level)) : 1;
}

type TextRegionProps = { block: BlockRenderProps['block']; label: string; placeholder?: string };

function TextRegion({ block, label, placeholder }: TextRegionProps) {
  return <EditableRegion block={block.id} region={REGION} label={label} placeholder={placeholder} />;
}

function NumberedItem({ block, controller }: BlockRenderProps) {
  const number = useEditorState(controller, ({ doc }) => {
    const index = doc.index.get(block.id);
    return index === undefined ? 1 : orderedNumber(doc, index);
  });
  return (
    <div className="quoin-list-item" data-list="ordered">
      <span className="quoin-marker" aria-hidden="true">{`${number}.`}</span>
      <TextRegion block={block} label={`Numbered list item ${number}`} />
    </div>
  );
}

export const MarkdownBlock: BlockRenderer = (props) => {
  const { block } = props;
  switch (block.attrs.kind) {
    case 'heading': {
      const level = headingLevel(block.attrs.level);
      return (
        <div role="heading" aria-level={level} className="quoin-heading">
          <TextRegion block={block} label={`Heading ${level}`} placeholder={`Heading ${level}`} />
        </div>
      );
    }
    case 'bullet':
      return (
        <div className="quoin-list-item" data-list="bullet">
          <span className="quoin-marker" aria-hidden="true">{'\u2022'}</span>
          <TextRegion block={block} label="Bullet list item" />
        </div>
      );
    case 'ordered':
      return <NumberedItem {...props} />;
    case 'task':
      return (
        <div className="quoin-task" data-checked={block.attrs.checked === true}>
          <TaskCheckbox block={block} controller={props.controller} />
          <TextRegion block={block} label="Task" />
        </div>
      );
    case 'quote':
      return (
        <div className="quoin-quote">
          <TextRegion block={block} label="Quote" />
        </div>
      );
    default:
      return <TextRegion block={block} label="Paragraph" />;
  }
};
