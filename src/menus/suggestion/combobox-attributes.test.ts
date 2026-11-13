import { act, renderHook } from '@testing-library/react';
import { insertText } from '../../engine';
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

const openOn = (controller: ReturnType<typeof twoHosts>['controller'], block: string, active: string | null = null) =>
  renderHook(({ on }) => useComboboxHost(controller, on, 'text', 'menu-1', active), { initialProps: { on: block } });

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

  it('follows the host React draws in place of the first one, and gives the first its attributes back', () => {
    const { controller, first } = twoHosts();
    openOn(controller, 'a', 'option-2');
    const replacement = textbox(first.parentElement!.appendChild(document.createElement('div')));
    act(() => controller.focus('start'));
    act(() => {
      controller.registry.register('a', 'text', replacement);
      expect(controller.run(insertText('x'))).toBe(true);
    });
    expect(replacement).toHaveAttribute('role', 'combobox');
    expect(replacement).toHaveAttribute('aria-controls', 'menu-1');
    expect(replacement).toHaveAttribute('aria-activedescendant', 'option-2');
    expect(first).toHaveAttribute('role', 'textbox');
    expect(first).not.toHaveAttribute('aria-activedescendant');
  });

  it('gives the host its own attributes back when a second menu opened on it as the first closed', () => {
    const { controller, first } = twoHosts();
    const { rerender } = renderHook(
      ({ slash, mention }) => {
        useComboboxHost(controller, slash, 'text', 'slash-menu', null);
        useComboboxHost(controller, mention, 'text', 'mention-menu', null);
      },
      { initialProps: { slash: null as string | null, mention: 'a' as string | null } },
    );
    expect(first).toHaveAttribute('aria-controls', 'mention-menu');

    rerender({ slash: 'a', mention: null });
    expect(first).toHaveAttribute('role', 'combobox');
    expect(first).toHaveAttribute('aria-controls', 'slash-menu');

    rerender({ slash: null, mention: null });
    expect(first).toHaveAttribute('role', 'textbox');
    expect(first).toHaveAttribute('aria-multiline', 'true');
    expect(first).not.toHaveAttribute('aria-expanded');
    expect(first).not.toHaveAttribute('aria-controls');
  });
});
