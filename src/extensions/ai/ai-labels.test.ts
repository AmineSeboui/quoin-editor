import { englishAiLabels, resolveAiLabels } from './ai-labels';

describe('the AI labels', () => {
  it('are English by default', () => {
    const labels = resolveAiLabels();
    expect(labels).toBe(englishAiLabels);
    expect(labels.askAi).toBe('Ask AI');
    expect(labels.askAiDescription).toBe('Write or edit with AI');
    expect(labels.actions).toEqual({
      continue: 'Continue writing',
      improve: 'Improve writing',
      fix: 'Fix spelling and grammar',
      shorten: 'Make shorter',
      lengthen: 'Make longer',
      simplify: 'Simplify language',
      tone: 'Change tone',
      translate: 'Translate',
      summarize: 'Summarize',
      explain: 'Explain',
      custom: 'Ask AI',
    });
    expect(labels.menu).toBe('AI actions');
    expect(labels.prompt).toBe('Ask AI to write or edit');
    expect(labels.tonePrompt).toBe('Tone to take, such as friendly');
    expect(labels.translatePrompt).toBe('Language to translate to');
    expect(labels.ask('a haiku')).toBe('Ask AI: a haiku');
    expect(labels.response).toBe('AI response');
    expect(labels.writing).toBe('Writing');
    expect(labels.stopped).toBe('Stopped');
    expect(labels.stop).toBe('Stop');
    expect(labels.accept).toBe('Accept');
    expect(labels.discard).toBe('Discard');
    expect(labels.retry).toBe('Retry');
    expect(labels.followUp).toBe('Tell AI what to do next');
    expect(labels.failed).toBe('AI could not answer');
    expect(labels.written('Hello there')).toBe('AI response ready: Hello there');
    expect(labels.halted('Hello')).toBe('Stopped. AI response so far: Hello');
    expect(labels.targetGone).toBe('The text this was for was removed, so Accept inserts it where that text was');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveAiLabels({ accept: 'Accepter', discard: undefined });
    expect(labels.accept).toBe('Accepter');
    expect(labels.discard).toBe('Discard');
    expect(resolveAiLabels({ stop: undefined })).toBe(englishAiLabels);
  });
});
