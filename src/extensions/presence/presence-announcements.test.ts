import { createPresenceAnnouncer, PRESENCE_ANNOUNCEMENT_MS } from './presence-announcements';
import { englishPresenceLabels } from './presence-labels';

const ada = { client: 7, name: 'Ada' };
const bea = { client: 5, name: 'Bea' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('announcing who joins and leaves', () => {
  it('groups the people who come and go at once into one announcement', () => {
    const announce = vi.fn();
    const announcer = createPresenceAnnouncer(announce, englishPresenceLabels);
    announcer.hear({ joined: [ada], left: [] });
    announcer.hear({ joined: [bea], left: [] });
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(announce.mock.calls).toEqual([['Ada and Bea joined']]);
    vi.advanceTimersByTime(PRESENCE_ANNOUNCEMENT_MS);
    announcer.hear({ joined: [], left: [bea] });
    announcer.hear({ joined: [{ client: 9, name: 'Cy' }], left: [] });
    vi.advanceTimersByTime(600);
    expect(announce.mock.calls.at(-1)).toEqual(['Cy joined. Bea left']);
  });

  it('says a change of the same person only a few seconds after the last, and none that undoes it', () => {
    const announce = vi.fn();
    const announcer = createPresenceAnnouncer(announce, englishPresenceLabels);
    announcer.hear({ joined: [ada], left: [] });
    vi.advanceTimersByTime(600);
    announcer.hear({ joined: [], left: [ada] });
    announcer.hear({ joined: [ada], left: [] });
    vi.advanceTimersByTime(PRESENCE_ANNOUNCEMENT_MS);
    expect(announce.mock.calls).toEqual([['Ada joined']]);
    announcer.hear({ joined: [], left: [ada] });
    vi.advanceTimersByTime(600);
    expect(announce.mock.calls.at(-1)).toEqual(['Ada left']);
  });

  it('says that a person left soon after joining once the few seconds are over', () => {
    const announce = vi.fn();
    const announcer = createPresenceAnnouncer(announce, englishPresenceLabels);
    announcer.hear({ joined: [ada], left: [] });
    vi.advanceTimersByTime(1000);
    announcer.hear({ joined: [], left: [ada] });
    vi.advanceTimersByTime(1000);
    expect(announce.mock.calls).toEqual([['Ada joined']]);
    vi.advanceTimersByTime(PRESENCE_ANNOUNCEMENT_MS);
    expect(announce.mock.calls).toEqual([['Ada joined'], ['Ada left']]);
  });

  it('drops what is waiting once stopped', () => {
    const announce = vi.fn();
    const announcer = createPresenceAnnouncer(announce, englishPresenceLabels);
    announcer.hear({ joined: [ada], left: [] });
    vi.advanceTimersByTime(600);
    announcer.hear({ joined: [], left: [ada] });
    announcer.hear({ joined: [bea], left: [] });
    announcer.stop();
    vi.advanceTimersByTime(PRESENCE_ANNOUNCEMENT_MS);
    expect(announce.mock.calls).toEqual([['Ada joined']]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
