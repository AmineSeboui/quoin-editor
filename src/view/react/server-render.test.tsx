// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Editor, md } from './test-harness';

describe('server rendering', () => {
  it('renders the shells and an empty host for each region where no document exists', () => {
    expect(typeof document).toBe('undefined');
    const html = renderToString(
      <Editor
        options={{ blocks: [md('h', '# Title'), md('t', '- [ ] job'), { id: 'd', type: 'DIVIDER', data: {} }], onChange: () => {} }}
      />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Doc"');
    expect(html).toContain('Press Escape, then Tab, to leave the editor.');
    expect(html).toMatch(/data-block-id="h"[^>]*data-kind="heading"/);
    expect(html).toContain('aria-label="Heading 1"');
    expect(html).toContain('role="checkbox"');
    expect(html).toMatch(/data-type="DIVIDER"/);
  });

  it('renders the empty document placeholder', () => {
    const html = renderToString(<Editor options={{ blocks: [], onChange: () => {} }} view={{ placeholder: 'Write' }} />);
    expect(html).toContain('data-placeholder="Write"');
  });
});
