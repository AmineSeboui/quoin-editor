import { copyText } from './copy-text';

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
});

function stubExecCommand(result: boolean) {
  const copied: string[] = [];
  const execCommand = vi.fn(() => {
    const area = document.activeElement as HTMLTextAreaElement;
    copied.push(area.value.slice(area.selectionStart, area.selectionEnd));
    return result;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
  return { copied, execCommand };
}

describe('copyText', () => {
  it('writes through the clipboard API when the page has it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await expect(copyText('# Title\n')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('# Title\n');
  });

  it('copies from a hidden text area without the clipboard API, then hands focus back', async () => {
    const button = document.body.appendChild(document.createElement('button'));
    button.focus();
    const { copied } = stubExecCommand(true);
    await expect(copyText('- item\n')).resolves.toBe(true);
    expect(copied).toEqual(['- item\n']);
    expect(document.querySelector('textarea')).toBeNull();
    expect(button).toHaveFocus();
    button.remove();
  });

  it('falls back to the text area when the clipboard API refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const { copied } = stubExecCommand(false);
    await expect(copyText('text')).resolves.toBe(false);
    expect(copied).toEqual(['text']);
  });
});
