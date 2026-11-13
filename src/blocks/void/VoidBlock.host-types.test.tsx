import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { englishLabels } from '../../i18n/english-labels';
import { Code, Image, Minus, Paperclip } from '../../icons';
import { defineBlock } from '../../registry';
import { mountCanvas, paragraph, testBlockTypes } from '../test-support/test-canvas';

const ownDefinition = (type: string, label: string, icon: typeof Code) =>
  defineBlock({ type, label, icon, editor: () => <input aria-label={`${label} field`} />, preview: () => <p>{label}</p> });

const hostTypes = [
  ownDefinition('IMAGE', 'Photo', Image),
  ownDefinition('FILE', 'Attachment', Paperclip),
  ownDefinition('CODE', 'Snippet', Code),
  ownDefinition('DIVIDER', 'Rule', Minus),
];

const blocks = [
  paragraph('a', 'above'),
  { id: 'i', type: 'IMAGE', data: {} },
  { id: 'f', type: 'FILE', data: {} },
  { id: 'c', type: 'CODE', data: {} },
  { id: 'd', type: 'DIVIDER', data: {} },
];

describe('a host definition of a type the canvas draws itself', () => {
  it.each(['Photo', 'Attachment', 'Snippet', 'Rule'])('names the %s block and its Edit button by its own label', (label) => {
    mountCanvas(blocks, { blockTypes: [...testBlockTypes, ...hostTypes] });
    expect(screen.getByRole('group', { name: label })).toHaveTextContent(label);
    expect(screen.getByRole('button', { name: `Edit ${label}` })).toBeInTheDocument();
  });

  it('heads the block menu with its own label', () => {
    const { nodeSelect, openBlockMenu } = mountCanvas(blocks, { blockTypes: [...testBlockTypes, ...hostTypes] });
    nodeSelect('i');
    expect(within(openBlockMenu()).getByText('Photo')).toBeInTheDocument();
  });

  it('offers to turn a block into it under its own label', async () => {
    const user = userEvent.setup();
    const { nodeSelect, openBlockMenu } = mountCanvas(blocks, { blockTypes: [...testBlockTypes, ...hostTypes] });
    nodeSelect('a');
    await user.click(within(openBlockMenu()).getByRole('menuitem', { name: 'Turn into' }));
    expect(screen.getByRole('menuitem', { name: 'Snippet' })).toBeInTheDocument();
  });

  it('offers to insert it in the slash menu under its own label', () => {
    const { handle } = mountCanvas([paragraph('a', '')], { blockTypes: [...testBlockTypes, ...hostTypes] });
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    const slash = new InputEvent('beforeinput', { inputType: 'insertText', data: '/', bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, slash);
    const options = screen.getAllByRole('option').map((option) => option.textContent ?? '');
    expect(options.some((text) => text.startsWith('Photo'))).toBe(true);
    expect(options.some((text) => text.startsWith('Snippet'))).toBe(true);
  });

  it('keeps the name the labels give a type the canvas draws with its own definition', () => {
    const blockNames = { ...englishLabels.blockNames, file: 'Fichier' };
    mountCanvas([paragraph('a', 'above'), { id: 'f', type: 'FILE', data: {} }], { labels: { blockNames } });
    expect(screen.getByRole('group', { name: 'Fichier' })).toBeInTheDocument();
  });
});
