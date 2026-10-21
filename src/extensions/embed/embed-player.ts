/** The players drawn at a height of their own, every other frame keeping the ratio of a video. */
const PLAYER_HEIGHTS: Readonly<Record<string, number>> = { spotify: 352, soundcloud: 166 };

export const playerHeight = (provider: string): number | undefined =>
  Object.hasOwn(PLAYER_HEIGHTS, provider) ? PLAYER_HEIGHTS[provider] : undefined;
