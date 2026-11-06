import { render } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import { resetDevWarnings } from '../dev-warn';
import { Sparkles } from '../icons';
import { defineBlock, type AnyBlockDefinition } from '../registry';
import { BlockCanvas } from './BlockCanvas';

const readOnlyPreview = () => null;
const hostCode = defineBlock({ type: 'CODE', label: 'Snippet', icon: Sparkles, preview: readOnlyPreview });
const hostMarkdown = defineBlock({ type: 'MARKDOWN', label: 'Text', icon: Sparkles, preview: readOnlyPreview });
const hostChart = defineBlock({ type: 'CHART', label: 'Chart', icon: Sparkles, preview: readOnlyPreview });

const mount = (blockTypes: AnyBlockDefinition[], readOnly = false) =>
  render(<BlockCanvas blocks={[]} onChange={() => {}} blockTypes={blockTypes} readOnly={readOnly} />);

describe('a host definition an editable canvas cannot honour', () => {
  const messages: string[] = [];
  const said = () => messages.join('\n');

  beforeEach(() => {
    resetDevWarnings();
    messages.length = 0;
    vi.spyOn(console, 'warn').mockImplementation((...parts: unknown[]) => {
      messages.push(parts.map(String).join(' '));
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('warns that CODE is edited through the preview the definition replaced', () => {
    mount([...coreBlocks, hostCode]);
    expect(said()).toMatch(/"CODE"/);
    expect(said()).toMatch(/preview/);
  });

  it('still warns for a type the canvas types into in place', () => {
    mount([...coreBlocks, hostMarkdown]);
    expect(said()).toMatch(/"MARKDOWN"/);
  });

  it("says nothing for a type of the host's own", () => {
    mount([...coreBlocks, hostChart]);
    expect(said()).toBe('');
  });

  it('says nothing while Quoin draws its own blocks', () => {
    mount([...coreBlocks]);
    expect(said()).toBe('');
  });

  it('says nothing on a read-only canvas, which draws the host preview as asked', () => {
    mount([...coreBlocks, hostCode], true);
    expect(said()).toBe('');
  });
});
