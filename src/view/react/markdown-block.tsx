import type { ComponentType } from 'react';
import { headingLevel } from '../../engine/render/heading-level';
import { useRegionDomId } from './block-dom-id';
import type { BlockRenderProps, BlockRenderer } from './block-renderer-types';
import { EditableRegion } from './EditableRegion';
import { useRendererLabels } from './renderer-labels-context';
import { TaskCheckbox } from './TaskCheckbox';
import { useOrderedNumber } from './use-ordered-number';

export type ListMarkerProps = { depth: number } & ({ list: 'bullet' } | { list: 'ordered'; number: number });

/** What the canvas draws in its own style on the markup it shares with the view: list markers and heading classes. */
export type MarkdownLook = {
  Marker: ComponentType<ListMarkerProps>;
  headingClassName: (level: number) => string;
};

const REGION = 'text';

function PlainMarker(props: ListMarkerProps) {
  return (
    <span className="quoin-marker" aria-hidden="true">
      {props.list === 'bullet' ? '•' : `${props.number}.`}
    </span>
  );
}

const VIEW_LOOK: MarkdownLook = { Marker: PlainMarker, headingClassName: () => 'quoin-heading' };

type TextHostProps = Pick<BlockRenderProps, 'block'> & { label: string; id?: string };

function TextHost({ block, label, id }: TextHostProps) {
  return <EditableRegion id={id} block={block.id} region={REGION} label={label} />;
}

type LookProps = BlockRenderProps & { look: MarkdownLook };

function Heading({ block, look }: LookProps) {
  const labels = useRendererLabels();
  const level = headingLevel(block.attrs.level);
  return (
    <div role="heading" aria-level={level} className={look.headingClassName(level)}>
      <TextHost block={block} label={labels.heading(level)} />
    </div>
  );
}

function NumberedItem({ block, controller, look }: LookProps) {
  const labels = useRendererLabels();
  const number = useOrderedNumber(controller, block.id);
  return (
    <div className="quoin-list-item" data-list="ordered">
      <look.Marker list="ordered" number={number} depth={block.indent} />
      <TextHost block={block} label={labels.numberedItem(number)} />
    </div>
  );
}

function TaskItem({ block, controller }: BlockRenderProps) {
  const { task } = useRendererLabels();
  const hostId = useRegionDomId(block.id, REGION);
  return (
    <div className="quoin-task" data-checked={block.attrs.checked === true}>
      <TaskCheckbox block={block} controller={controller} label={task} labelledBy={hostId} />
      <TextHost id={hostId} block={block} label={task} />
    </div>
  );
}

/** A markdown block in the markup the view and the canvas share, in the look the canvas gives it or the view's own. */
export function MarkdownText({ look = VIEW_LOOK, ...props }: BlockRenderProps & { look?: MarkdownLook }) {
  const { block } = props;
  const labels = useRendererLabels();
  switch (block.attrs.kind) {
    case 'heading':
      return <Heading {...props} look={look} />;
    case 'bullet':
      return (
        <div className="quoin-list-item" data-list="bullet">
          <look.Marker list="bullet" depth={block.indent} />
          <TextHost block={block} label={labels.bulletItem} />
        </div>
      );
    case 'ordered':
      return <NumberedItem {...props} look={look} />;
    case 'task':
      return <TaskItem {...props} />;
    case 'quote':
      return (
        <blockquote className="quoin-quote">
          <TextHost block={block} label={labels.quote} />
        </blockquote>
      );
    default:
      return <TextHost block={block} label={labels.paragraph} />;
  }
}

export const MarkdownBlock: BlockRenderer = MarkdownText;
