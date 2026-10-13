import { useEffect, useLayoutEffect } from 'react';

// React 18 warns about a layout effect rendered on the server, where there is no layout to run it against.
export const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;
