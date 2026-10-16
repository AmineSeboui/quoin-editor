import { render, screen } from '@testing-library/react';
import { createEditor } from './engine';
import { ViewController } from './view';
import { QuoinProvider, useQuoin, type QuoinConfig } from './context';

let seen: QuoinConfig | null = null;

function Probe() {
  const config = useQuoin();
  const { upload, resolveAssetUrl, onError, blockTypes } = config;
  seen = config;
  return (
    <div>
      <span data-testid="upload">{upload ? 'yes' : 'no'}</span>
      <span data-testid="url">{resolveAssetUrl('abc')}</span>
      <span data-testid="types">{blockTypes.length}</span>
      <button onClick={() => onError(new Error('boom'))}>fail</button>
    </div>
  );
}

describe('QuoinProvider', () => {
  it('defaults resolveAssetUrl to the identity function', () => {
    render(<QuoinProvider value={{ blockTypes: [] }}><Probe /></QuoinProvider>);
    expect(screen.getByTestId('url')).toHaveTextContent('abc');
  });

  it('reports no upload function when none is supplied', () => {
    render(<QuoinProvider value={{ blockTypes: [] }}><Probe /></QuoinProvider>);
    expect(screen.getByTestId('upload')).toHaveTextContent('no');
  });

  it('passes the supplied block types through', () => {
    const types = [{ type: 'X', label: 'X', icon: (() => null) as never, editor: () => null }];
    render(<QuoinProvider value={{ blockTypes: types }}><Probe /></QuoinProvider>);
    expect(screen.getByTestId('types')).toHaveTextContent('1');
  });

  it('carries no editor controller when no canvas supplied one', () => {
    render(<QuoinProvider value={{ blockTypes: [] }}><Probe /></QuoinProvider>);
    expect(seen?.controller).toBeNull();
  });

  it('carries the editor controller it is given', () => {
    const controller = new ViewController({ editor: createEditor({ blocks: [] }) });
    render(<QuoinProvider value={{ blockTypes: [], controller }}><Probe /></QuoinProvider>);
    expect(seen?.controller).toBe(controller);
  });

  it('throws a named error when used outside a provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/QuoinProvider/);
    quiet.mockRestore();
  });
});
