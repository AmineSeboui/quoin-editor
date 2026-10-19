import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { QuoinBlock } from '../../types';
import { mountCanvas } from '../void/test-canvas';

const code = (language: string): QuoinBlock => ({ id: 'k', type: 'CODE', data: { language, code: 'x' } });
const field = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'Language' });
const options = () => within(screen.getByRole('listbox', { name: 'Language' })).getAllByRole('option');
const area = () => screen.getByRole('textbox', { name: 'Code' });

function open(language: string) {
  const canvas = mountCanvas([code(language)]);
  act(() => field().focus());
  return canvas;
}

describe('the language combobox', () => {
  it('shows the name of a known language, an unknown one as written, and plain text as its placeholder', () => {
    mountCanvas([code('ts'), { id: 'u', type: 'CODE', data: { language: 'cobol', code: '' } }, { id: 'p', type: 'CODE', data: { language: '', code: '' } }]);
    const [known, unknown, plain] = screen.getAllByRole<HTMLInputElement>('combobox', { name: 'Language' });
    expect(known).toHaveValue('TypeScript');
    expect(unknown).toHaveValue('cobol');
    expect(plain).toHaveValue('');
    expect(plain).toHaveAttribute('placeholder', 'Plain text');
  });

  it('lists plain text and every language when it takes focus, and filters the list as the query grows', () => {
    open('ts');
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toHaveLength(41);
    fireEvent.change(field(), { target: { value: 'scr' } });
    expect(options().map((option) => option.textContent)).toEqual(['JavaScript', 'TypeScript']);
  });

  it('picks the option the arrows reach on Enter, then puts focus back in the code', () => {
    const { last } = open('ts');
    fireEvent.change(field(), { target: { value: 'py' } });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(field()).toHaveAttribute('aria-activedescendant', options()[0].id);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(last()).toEqual([{ id: 'k', type: 'CODE', data: { language: 'python', code: 'x' } }]);
    expect(document.activeElement).toBe(area());
  });

  it('stores a language it does not list as typed, on Enter', () => {
    const { last } = open('ts');
    fireEvent.change(field(), { target: { value: 'cobol ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(last()[0].data).toEqual({ language: 'cobol', code: 'x' });
  });

  it('picks an option on click', () => {
    const { last } = open('');
    fireEvent.change(field(), { target: { value: 'rust' } });
    fireEvent.click(options()[0]);
    expect(last()[0].data).toEqual({ language: 'rust', code: 'x' });
  });

  it('keeps the language when left with Escape or by moving focus away, whatever was typed', () => {
    const { changes } = open('ts');
    fireEvent.change(field(), { target: { value: 'go' } });
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(changes).toEqual([]);
    expect(document.activeElement).toBe(area());
    expect(field()).toHaveValue('TypeScript');
    act(() => field().focus());
    fireEvent.change(field(), { target: { value: 'Go' } });
    act(() => field().blur());
    expect(changes).toEqual([]);
    expect(field()).toHaveValue('TypeScript');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('stores a listed name typed in full as its id, on Enter', () => {
    const { last } = open('ts');
    fireEvent.change(field(), { target: { value: 'Go' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(last()[0].data).toEqual({ language: 'go', code: 'x' });
  });

  it('has no accessibility violations while its list is open', async () => {
    const { container } = open('ts');
    const block = await act(() => axe(container));
    const list = await act(() => axe(screen.getByRole('listbox').parentElement!));
    expect(block).toHaveNoViolations();
    expect(list).toHaveNoViolations();
  });
});
