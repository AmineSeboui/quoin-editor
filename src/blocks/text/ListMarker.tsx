import { bulletGlyph, orderedLabel } from './marker-styles';

type ListMarkerProps = { depth: number } & ({ list: 'bullet' } | { list: 'ordered'; number: number });

export function ListMarker(props: ListMarkerProps) {
  const text = props.list === 'bullet' ? bulletGlyph(props.depth) : orderedLabel(props.number, props.depth);
  return (
    <span className="quoin-marker" aria-hidden="true">
      {text}
    </span>
  );
}
