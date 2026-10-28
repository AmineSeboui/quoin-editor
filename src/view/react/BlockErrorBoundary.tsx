import { Component, useContext, type ReactNode } from 'react';
import type { EngineBlock } from '../../engine';
import { BlockErrorContext } from './block-error-context';

type Props = { block: EngineBlock; label: string; report?: (error: Error) => void; children: ReactNode };
type State = { block: EngineBlock; failed: boolean };

class Boundary extends Component<Props, State> {
  state: State = { block: this.props.block, failed: false };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    return props.block === state.block ? null : { block: props.block, failed: false };
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

export function BlockErrorBoundary({ block, children }: { block: EngineBlock; children: ReactNode }) {
  const { label, report } = useContext(BlockErrorContext);
  return (
    <Boundary block={block} label={label} report={report}>
      {children}
    </Boundary>
  );
}
