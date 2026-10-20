import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { nodeSelection } from '../../engine';
import type { QuoinBlock } from '../../types';
import { md } from '../../view/react/test-harness';
import { mountCanvas } from '../void/test-canvas';
import { textRenderers } from './text-renderers';

const callout = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'CALLOUT', data });
const toggle = (id: string, markdown: string, open: boolean): QuoinBlock => ({ id, type: 'TOGGLE', data: { markdown, open } });
const divider = (id: string): QuoinBlock => ({ id, type: 'DIVIDER', data: {} });

const markers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.quoin-marker'), (marker) => marker.textContent);

describe('textRenderers', () => {
  it('draws the block types the canvas types into, and the divider', () => {
    expect(Object.keys(textRenderers).sort()).toEqual(['CALLOUT', 'DIVIDER', 'MARKDOWN', 'TOGGLE']);
  });
});

describe('a markdown block in the canvas', () => {
  it('exposes each heading level as a heading around a host named after it', () => {
    const levels = [1, 2, 3, 4, 5, 6];
    mountCanvas(levels.map((level) => md(`h${level}`, `${'#'.repeat(level)} Level ${level}`)));
    for (const level of levels) {
      const heading = screen.getByRole('heading', { level });
      expect(within(heading).getByRole('textbox', { name: `Heading ${level}` })).toHaveTextContent(`Level ${level}`);
    }
  });

  it('cycles the bullet glyph with the depth of the item', () => {
    const { container } = mountCanvas([md('a', '- one'), md('b', '- two', 1), md('c', '- three', 2), md('d', '- four', 3)]);
    expect(markers(container)).toEqual(['\u2022', '\u25E6', '\u25AA', '\u2022']);
    expect(screen.getAllByRole('textbox', { name: 'Bullet list item' })).toHaveLength(4);
  });

  it('labels ordered items in decimal, lower alpha and lower roman by depth', () => {
    const { container } = mountCanvas([md('a', '1. one'), md('b', '1. two', 1), md('c', '1. three', 2), md('d', '1. four', 2)]);
    expect(markers(container)).toEqual(['1.', 'a.', 'i.', 'ii.']);
    expect(screen.getByRole('textbox', { name: 'Numbered list item 2' })).toHaveTextContent('four');
  });

  it('hides its markers from assistive technology', () => {
    const { container } = mountCanvas([md('a', '- one'), md('b', '1. two')]);
    for (const marker of container.querySelectorAll('.quoin-marker')) expect(marker).toHaveAttribute('aria-hidden', 'true');
  });

  it('checks a task from its checkbox and marks the block done', () => {
    const { last, shell } = mountCanvas([md('t', '- [ ] job')]);
    act(() => screen.getByRole('checkbox', { name: 'Task' }).click());
    expect(last()[0].data.markdown).toBe('- [x] job');
    expect(screen.getByRole('checkbox', { name: 'Task' })).toHaveAttribute('aria-checked', 'true');
    expect(shell('t').querySelector('.quoin-task')).toHaveAttribute('data-checked', 'true');
  });

  it('names a task checkbox after the host that holds the task', () => {
    const { shell } = mountCanvas([md('t', '- [ ] Buy milk')]);
    const host = shell('t').querySelector<HTMLElement>('[data-quoin-host]')!;
    expect(host.id).not.toBe('');
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-labelledby', host.id);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-label', 'Task');
  });

  it('names every host and control in the words the canvas labels give', () => {
    const labels = {
      paragraph: 'Paragraphe',
      heading: (level: number) => `Titre ${level}`,
      placeholderHeading: (level: number) => `Titre de niveau ${level}`,
      bulletItem: 'Puce',
      numberedItem: (n: number) => `Element ${n}`,
      task: 'Tache',
      quote: 'Citation',
    };
    mountCanvas([md('p', 'text'), md('h', '## '), md('b', '- b'), md('n', '1. n'), md('t', '- [ ] t'), md('q', '> q')], {
      labels,
    });
    for (const name of ['Paragraphe', 'Titre 2', 'Puce', 'Element 1', 'Tache', 'Citation']) {
      expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('checkbox', { name: 'Tache' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Titre 2' })).toHaveAttribute('data-placeholder', 'Titre de niveau 2');
  });
});

describe('a callout in the canvas', () => {
  it('names its host after its tone and takes a new tone from its tone menu', async () => {
    const user = userEvent.setup();
    const { last, container } = mountCanvas([callout('c', { tone: 'warning', body: 'Careful' })]);
    expect(screen.getByRole('textbox', { name: 'Callout, warning' })).toHaveTextContent('Careful');
    await user.click(screen.getByRole('button', { name: 'Callout tone: warning' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'danger' }));
    expect(last()[0].data).toMatchObject({ tone: 'danger', body: 'Careful' });
    expect(screen.getByRole('textbox', { name: 'Callout, danger' })).toBeInTheDocument();
    expect(container.querySelector('.quoin-callout')).toHaveAttribute('data-tone', 'danger');
  });

  it('shows the icon of its tone until another is picked from its icon menu', async () => {
    const user = userEvent.setup();
    const { last } = mountCanvas([callout('c', { tone: 'warning', body: 'Careful' })]);
    const icon = screen.getByRole('button', { name: 'Callout icon' });
    expect(icon).toHaveTextContent('\u26A0\uFE0F');
    await user.click(icon);
    const choices = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(choices).toEqual(['\u{1F4A1}', '\u26A0\uFE0F', '\u2705', '\u2757', '\u2139\uFE0F', '\u{1F4CC}']);
    await user.click(screen.getByRole('menuitem', { name: '\u{1F4CC}' }));
    expect(last()[0].data).toMatchObject({ tone: 'warning', icon: '\u{1F4CC}' });
    expect(screen.getByRole('button', { name: 'Callout icon' })).toHaveTextContent('\u{1F4CC}');
  });

  it('gives the caret back to the text once a tone is picked', async () => {
    const user = userEvent.setup();
    mountCanvas([callout('c', { tone: 'info', body: 'Note' })]);
    await user.click(screen.getByRole('button', { name: 'Callout tone: info' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'tip' }));
    expect(screen.getByRole('textbox', { name: 'Callout, tip' })).toHaveFocus();
  });

  it('reads an unknown or missing tone as info', () => {
    mountCanvas([callout('a', { tone: 'note', body: 'one' }), callout('b', { body: 'two' })]);
    expect(screen.getAllByRole('textbox', { name: 'Callout, info' })).toHaveLength(2);
  });

  it('offers no menus while read-only, and still shows its icon', () => {
    const { shell } = mountCanvas([callout('c', { tone: 'success', body: 'Done' })], { readOnly: true });
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(shell('c')).toHaveTextContent('\u2705');
  });

  it('names its host with the tone name a host gives, written as given', () => {
    const calloutTones = { info: 'Hinweis', tip: 'Tipp', success: 'Erfolg', warning: 'Warnung', danger: 'Gefahr' };
    mountCanvas([callout('c', { tone: 'warning', body: 'x' })], { labels: { calloutTones } });
    expect(screen.getByRole('textbox', { name: 'Callout, Warnung' })).toBeInTheDocument();
  });

  it('names its tones, its icon button and its host in the words the canvas labels give', () => {
    const calloutTones = { info: 'Note', tip: 'Astuce', success: 'Reussite', warning: 'Attention', danger: 'Danger' };
    mountCanvas([callout('c', { tone: 'warning', body: 'x' })], {
      labels: {
        calloutTones,
        callout: (tone) => `Encadre ${tone}`,
        calloutIcon: 'Icone',
        calloutToneMenu: (tone) => `Ton ${tone}`,
      },
    });
    expect(screen.getByRole('textbox', { name: 'Encadre Attention' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ton Attention' })).toHaveTextContent('Attention');
    expect(screen.getByRole('button', { name: 'Icone' })).toBeInTheDocument();
  });
});

describe('a toggle in the canvas', () => {
  const nested = (open: boolean) => [toggle('t', 'Summary', open), md('c', 'child', 1), md('g', 'grandchild', 2), md('s', 'sibling')];

  it('hides the hosts of its children when collapsed and says on its chevron how many are hidden', () => {
    const { shell, last } = mountCanvas(nested(true));
    const chevron = screen.getByRole('button', { name: 'Toggle' });
    expect(chevron).toHaveAttribute('aria-expanded', 'true');
    expect(shell('c').querySelector('[data-quoin-host]')).toHaveTextContent('child');
    act(() => chevron.click());
    expect(last()[0].data.open).toBe(false);
    expect(shell('c')).toBeNull();
    expect(shell('g')).toBeNull();
    expect(screen.getByRole('button', { name: 'Toggle, 2 blocks hidden' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('textbox', { name: 'Toggle' })).toHaveTextContent('Summary');
  });

  it('points its chevron at the blocks it opens and closes', () => {
    mountCanvas(nested(true));
    const controlled = screen.getByRole('button', { name: 'Toggle' }).getAttribute('aria-controls')!.split(' ');
    expect(controlled.map((id) => document.getElementById(id)?.dataset.blockId)).toEqual(['c', 'g']);
  });

  it('controls nothing when no block sits under it', () => {
    mountCanvas([toggle('t', 'Alone', false), md('s', 'sibling')]);
    expect(screen.getByRole('button', { name: 'Toggle' })).not.toHaveAttribute('aria-controls');
  });
});

describe('a divider in the canvas', () => {
  it('is a separator with no text, outside any editable host', () => {
    mountCanvas([md('a', 'above'), divider('d')]);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveTextContent('');
    expect(separator.closest('[data-quoin-host]')).toBeNull();
    expect(separator.closest('[contenteditable="false"]')).not.toBeNull();
  });

  it('is node-selected and focused by a click', () => {
    const { selection, shell } = mountCanvas([md('a', 'above'), divider('d'), md('b', 'below')]);
    act(() => screen.getByRole('separator').click());
    expect(selection()).toEqual(nodeSelection('d'));
    expect(shell('d')).toHaveFocus();
  });
});

describe('the text blocks together', () => {
  it('have no accessibility violations', async () => {
    const { container } = mountCanvas([
      md('h', '# Title'),
      md('b', '- bullet'),
      md('n', '1. numbered', 1),
      md('t', '- [x] task'),
      md('q', '> quote'),
      callout('c', { tone: 'warning', body: 'Careful' }),
      toggle('o', 'Open', true),
      md('oc', 'inside', 1),
      toggle('x', 'Closed', false),
      md('xc', 'hidden', 1),
      divider('d'),
      md('p', 'end', 0),
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
