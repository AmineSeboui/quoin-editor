import { render } from '@testing-library/react';
import { coreExtensions, defineExtension, type Decoration } from '../../engine';
import { Editor, md } from './test-harness';

const hostile = defineExtension({
  name: 'hostile',
  decorations: (): Decoration[] => [
    {
      kind: 'block',
      block: 'a',
      attrs: {
        'data-ok': 'yes',
        'aria-busy': 'true',
        style: 'color: red',
        className: 'bad',
        class: 'bad',
        dangerouslySetInnerHTML: '<b>x</b>',
        onClick: 'alert(1)',
        'data-': 'empty',
        'xdata-no': 'no',
      },
    },
  ],
});

describe('the attributes a block decoration writes', () => {
  it('are the data and aria ones only, and never make React throw', () => {
    const { container } = render(<Editor options={{ blocks: [md('a', 'one')], onChange: () => {}, extensions: [...coreExtensions(), hostile] }} />);
    const shell = container.querySelector('[data-block-id="a"]')!;
    expect(shell.getAttribute('data-ok')).toBe('yes');
    expect(shell.getAttribute('aria-busy')).toBe('true');
    expect(shell.getAttribute('class')).toBeNull();
    expect(shell.getAttribute('onclick')).toBeNull();
    expect(shell.getAttribute('xdata-no')).toBeNull();
    expect(shell.getAttribute('style')).toBe('--quoin-indent: 0;');
    expect(shell.innerHTML).not.toContain('<b>x</b>');
  });
});
