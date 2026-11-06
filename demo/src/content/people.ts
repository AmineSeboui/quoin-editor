import type { MentionResult } from 'quoin-editor/mention';

const PEOPLE: MentionResult[] = [
  { id: 'ada', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: 'grace', label: 'Grace Hopper', kind: 'user', description: 'Computer scientist' },
  { id: 'alan', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
];

/** The `search` the mention feature takes, answering from a list this page holds rather than a service. */
export const searchPeople = async (query: string): Promise<MentionResult[]> =>
  PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));
