import { Component, useContext, type ReactNode } from 'react';
import type { EngineBlock } from '../../engine';
import { BlockErrorContext } from './block-error-context';
import type { BlockRenderer } from './block-renderer-types';

type Drawn = { block: EngineBlock; renderer: BlockRenderer };
type Props = Drawn & { label: string; report?: (error: Error) => void; children: ReactNode };
type State = Drawn & { failed: boolean };

class Boundary extends Component<Props, State> {
  state: State = { block: this.props.block, renderer: this.props.renderer, failed: false };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    const same = props.block === state.block && props.renderer === state.renderer;
    return same ? null : { block: props.block, renderer: props.renderer, failed: false };
  }

  componentDidCatch(error: unknown) {
    this.props.report?.(error instanceof Error ? error : new Error(String(error)));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { label } = this.props;
    return (
      <div className="quoin-void" contentEditable={false} role="group" aria-label={label}>
        {label}
      </div>
    );
  }
}

export function BlockErrorBoundary({ block, renderer, children }: Drawn & { children: ReactNode }) {
  const { label, report } = useContext(BlockErrorContext);
  return (
    <Boundary block={block} renderer={renderer} label={label} report={report}>
      {children}
    </Boundary>
  );
}
