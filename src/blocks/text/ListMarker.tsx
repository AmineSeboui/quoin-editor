import type { ListMarkerProps } from '../../view/react/markdown-block';
import { bulletGlyph, orderedLabel } from './marker-styles';

export function ListMarker(props: ListMarkerProps) {
  const text = props.list === 'bullet' ? bulletGlyph(props.depth) : orderedLabel(props.number, props.depth);
  return (
    <span className="quoin-marker" aria-hidden="true">
      {text}
    </span>
  );
}
