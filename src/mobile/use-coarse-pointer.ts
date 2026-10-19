import { useMediaQuery } from '../ui/use-media-query';

export const useCoarsePointer = (): boolean => useMediaQuery('(pointer: coarse)', false);
