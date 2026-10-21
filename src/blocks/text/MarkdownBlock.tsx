'use client';

import { useLabels } from '../../i18n/use-labels';
import { EditableRegion, type BlockRenderProps, type BlockRenderer } from '../../view';
import { useRegionDomId } from '../../view/react/block-dom-id';
import { headingLevel } from '../../engine/render/heading-level';
import { useOrderedNumber } from '../../view/react/use-ordered-number';
import { ListMarker } from './ListMarker';
import { TaskCheckbox } from './TaskCheckbox';

const REGION = 'text';

const HEADING_LEVELS = ['mt-6 text-3xl', 'mt-5 text-2xl', 'mt-4 text-xl', 'mt-3 text-lg', 'mt-3 text-base', 'mt-3 text-sm'];

const headingStyles = (level: number) =>
  `quoin-heading mb-1 font-semibold leading-tight in-[[data-quoin-block]:first-child]:mt-0 ${HEADING_LEVELS[level - 1]}`;

function Heading({ block }: Pick<BlockRenderProps, 'block'>) {
  const labels = useLabels();
  const level = headingLevel(block.attrs.level);
  return (
    <div role="heading" aria-level={level} className={headingStyles(level)}>
      <EditableRegion block={block.id} region={REGION} label={labels.heading(level)} />
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

function TaskItem({ block, controller }: BlockRenderProps) {
  const labels = useLabels();
  const hostId = useRegionDomId(block.id, REGION);
  return (
    <div className="quoin-task" data-checked={block.attrs.checked === true}>
      <TaskCheckbox block={block} controller={controller} labelledBy={hostId} />
      <EditableRegion id={hostId} block={block.id} region={REGION} label={labels.task} />
    </div>
  );
}

export const MarkdownBlock: BlockRenderer = (props) => {
  const { block } = props;
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
      return <TaskItem {...props} />;
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
