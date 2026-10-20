import { useMediaQuery } from '../../ui/use-media-query';

export const useFinePointer = (): boolean => useMediaQuery('(pointer: fine)', true);
