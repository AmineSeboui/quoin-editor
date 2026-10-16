'use client';

import { cva } from 'class-variance-authority';
import { useLabels } from '../../i18n/use-labels';
import { EditableRegion, type BlockRenderProps, type BlockRenderer } from '../../view';
import { headingLevel } from '../../view/react/heading-level';
import { useOrderedNumber } from '../../view/react/use-ordered-number';
import { ListMarker } from './ListMarker';
import { TaskCheckbox } from './TaskCheckbox';

const REGION = 'text';

const headingStyles = cva(
  'quoin-heading mb-1 font-semibold leading-tight in-[[data-quoin-block]:first-child]:mt-0',
  {
    variants: {
      level: {
        1: 'mt-6 text-3xl',
        2: 'mt-5 text-2xl',
        3: 'mt-4 text-xl',
        4: 'mt-3 text-lg',
        5: 'mt-3 text-base',
        6: 'mt-3 text-sm',
      },
    },
  },
);

function Heading({ block }: Pick<BlockRenderProps, 'block'>) {
  const labels = useLabels();
  const level = headingLevel(block.attrs.level);
  return (
    <div role="heading" aria-level={level} className={headingStyles({ level })}>
      <EditableRegion
        block={block.id}
        region={REGION}
        label={labels.heading(level)}
        placeholder={labels.placeholderHeading(level)}
      />
    </div>
  );
}

function NumberedItem({ block, controller }: BlockRenderProps) {
  const labels = useLabels();
  const number = useOrderedNumber(controller, block.id);
  return (
    <div className="quoin-list-item" data-list="ordered">
      <ListMarker list="ordered" number={number} depth={block.indent} />
      <EditableRegion block={block.id} region={REGION} label={labels.numberedItem(number)} />
    </div>
  );
}

export const MarkdownBlock: BlockRenderer = (props) => {
  const { block, controller } = props;
  const labels = useLabels();
  switch (block.attrs.kind) {
    case 'heading':
      return <Heading block={block} />;
    case 'bullet':
      return (
        <div className="quoin-list-item" data-list="bullet">
          <ListMarker list="bullet" depth={block.indent} />
          <EditableRegion block={block.id} region={REGION} label={labels.bulletItem} />
        </div>
      );
    case 'ordered':
      return <NumberedItem {...props} />;
    case 'task':
      return (
        <div className="quoin-task" data-checked={block.attrs.checked === true}>
          <TaskCheckbox block={block} controller={controller} />
          <EditableRegion block={block.id} region={REGION} label={labels.task} />
        </div>
      );
    case 'quote':
      return (
        <div className="quoin-quote">
          <EditableRegion block={block.id} region={REGION} label={labels.quote} />
        </div>
      );
    default:
      return <EditableRegion block={block.id} region={REGION} label={labels.paragraph} />;
  }
};
