import type { Page } from '@playwright/test';

// Firefox ignores the clipboardData and dataTransfer a ClipboardEvent or DragEvent constructor is given, so the handler
// would see no data. A plain Event with the data defined on the instance is delivered unchanged by every browser.
export type Flavours = { prevented: boolean; plain: string; html: string; json: string };

type Spec = {
  type: 'copy' | 'cut' | 'paste' | 'dragstart' | 'dragover' | 'drop';
  data?: Record<string, string>;
  files?: { name: string; type: string; base64?: string }[];
  // One DataTransfer stands in for the system clipboard across calls, so a copy can be followed by a paste.
  clipboard?: boolean;
  at?: { x: number; y: number };
  selector?: string;
  firstChild?: boolean;
};

function dispatch(page: Page, spec: Spec): Promise<Flavours> {
  return page.evaluate((spec) => {
    const w = window as unknown as { __clip?: DataTransfer };
    let transfer: DataTransfer | null = null;
    if (spec.clipboard) transfer = w.__clip ??= new DataTransfer();
    else if (spec.data || spec.files) transfer = new DataTransfer();
    for (const [type, value] of Object.entries(spec.data ?? {})) transfer!.setData(type, value);
    for (const { name, type, base64 } of spec.files ?? []) {
      const bytes = base64 === undefined ? 'x' : Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      transfer!.items.add(new File([bytes], name, { type }));
    }

    const event = new Event(spec.type, { bubbles: true, cancelable: true });
    const key = spec.type === 'copy' || spec.type === 'cut' || spec.type === 'paste' ? 'clipboardData' : 'dataTransfer';
    Object.defineProperty(event, key, { value: transfer });
    if (spec.at) {
      Object.defineProperty(event, 'clientX', { value: spec.at.x });
      Object.defineProperty(event, 'clientY', { value: spec.at.y });
    }
    let target: Node | null = spec.at
      ? document.elementFromPoint(spec.at.x, spec.at.y)
      : spec.selector
        ? document.querySelector(spec.selector)
        : document.activeElement;
    if (spec.firstChild) target = target!.firstChild;
    const prevented = !target!.dispatchEvent(event);
    return {
      prevented,
      plain: transfer?.getData('text/plain') ?? '',
      html: transfer?.getData('text/html') ?? '',
      json: transfer?.getData('application/x-quoin+json') ?? '',
    };
  }, spec);
}

export const copyEvent = (page: Page) => dispatch(page, { type: 'copy', clipboard: true });

export const cutEvent = (page: Page) => dispatch(page, { type: 'cut', clipboard: true });

// Pastes what the last copy or cut left on the shared clipboard, or the given flavours.
export const pasteEvent = (page: Page, data?: Record<string, string>) =>
  data ? dispatch(page, { type: 'paste', data }) : dispatch(page, { type: 'paste', clipboard: true });

export const pasteFilesEvent = (page: Page, files: Spec['files']) => dispatch(page, { type: 'paste', files });

export const dropEvent = (page: Page, at: { x: number; y: number }, transfer: Pick<Spec, 'data' | 'files'>) =>
  dispatch(page, { type: 'drop', at, ...transfer });

export const dragEvent = (
  page: Page,
  options: { type: 'dragstart' | 'dragover'; selector: string; data?: Record<string, string>; firstChild?: boolean },
) => dispatch(page, options);
