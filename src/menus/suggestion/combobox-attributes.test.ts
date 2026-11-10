import { renderHook } from '@testing-library/react';
import { cleanUpAfterTest, mountController } from '../../view/controller/test-controller';
import { useComboboxHost } from './combobox-attributes';

afterEach(cleanUpAfterTest);

function textbox(element: HTMLElement): HTMLElement {
  element.setAttribute('role', 'textbox');
  element.setAttribute('aria-multiline', 'true');
  return element;
}

function twoHosts() {
  const { controller, host, root } = mountController();
  const second = textbox(root.appendChild(document.createElement('div')));
  controller.registry.register('b', 'text', second);
  return { controller, first: textbox(host), second };
}

const openOn = (controller: ReturnType<typeof twoHosts>['controller'], block: string) =>
  renderHook(({ on }) => useComboboxHost(controller, on, 'text', 'menu-1', null), { initialProps: { on: block } });

describe('the host a menu makes its combobox', () => {
  it('moves to another block and gives the first its own attributes back', () => {
    const { controller, first, second } = twoHosts();
    const { rerender } = openOn(controller, 'a');
    expect(first).toHaveAttribute('role', 'combobox');
    expect(first).toHaveAttribute('aria-controls', 'menu-1');

    rerender({ on: 'b' });
    expect(second).toHaveAttribute('role', 'combobox');
    expect(second).toHaveAttribute('aria-controls', 'menu-1');
    expect(first).toHaveAttribute('role', 'textbox');
    expect(first).toHaveAttribute('aria-multiline', 'true');
    for (const name of ['aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-activedescendant']) {
      expect(first).not.toHaveAttribute(name);
    }
  });

  it('gives the host its attributes back when the menu goes with the component', () => {
    const { controller, first } = twoHosts();
    const { unmount } = openOn(controller, 'a');
    expect(first).toHaveAttribute('role', 'combobox');
    unmount();
    expect(first).toHaveAttribute('role', 'textbox');
    expect(first).toHaveAttribute('aria-multiline', 'true');
    expect(first).not.toHaveAttribute('aria-expanded');
  });
});
