// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';

describe('server import', () => {
  it('loads the controller and builds one where no document or window exists', async () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const { ViewController } = await import('./view-controller');
    const controller = new ViewController({ editor: createEditor({ blocks: [] }) });
    expect(controller.root).toBeNull();
    expect(controller.registry.get('a', 'text')).toBeUndefined();
  });
});
