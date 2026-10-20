import { act } from '@testing-library/react';

/** Moves focus off a disabled control, as a browser does when the focused control becomes disabled and jsdom does not. */
export function dropFocusLikeABrowser(control: HTMLInputElement) {
  act(() => {
    control.disabled = false;
    control.blur();
    control.disabled = true;
  });
}
