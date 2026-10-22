import { closeStreaming } from './streaming-markdown';

describe('closing markdown that is still streaming, for display', () => {
  it('keeps complete markdown as it is', () => {
    const done = '# Title\n\nSome **bold** and `code` with [a link](https://quoin.test).\n\n- one\n- two\n';
    expect(closeStreaming(done)).toBe(done);
  });

  it('closes an unfinished bold, strike and inline code', () => {
    expect(closeStreaming('Some **bold')).toBe('Some **bold**');
    expect(closeStreaming('Some ~~gone')).toBe('Some ~~gone~~');
    expect(closeStreaming('Run `npm')).toBe('Run `npm`');
  });

  it('closes nested emphasis innermost first', () => {
    expect(closeStreaming('**bold *and italic')).toBe('**bold *and italic***');
    expect(closeStreaming('*one **two')).toBe('*one **two***');
  });

  it('drops a marker nothing follows yet instead of closing it on nothing', () => {
    expect(closeStreaming('Some **')).toBe('Some ');
    expect(closeStreaming('Some **bold** and *')).toBe('Some **bold** and ');
  });

  it('leaves what is inside inline code alone', () => {
    expect(closeStreaming('`a ** b` and **c')).toBe('`a ** b` and **c**');
  });

  it('closes an open code fence, with its own fence characters', () => {
    expect(closeStreaming('Look:\n\n```js\nconst a = 1;')).toBe('Look:\n\n```js\nconst a = 1;\n```');
    expect(closeStreaming('~~~~\nx')).toBe('~~~~\nx\n~~~~');
    expect(closeStreaming('```\n**not bold')).toBe('```\n**not bold\n```');
  });

  it('closes only the syntax after a closed fence', () => {
    expect(closeStreaming('```\na\n```\n\nThen **b')).toBe('```\na\n```\n\nThen **b**');
  });

  it('drops a list item, heading or quote that has only its marker so far', () => {
    expect(closeStreaming('- one\n- ')).toBe('- one\n');
    expect(closeStreaming('Intro\n\n2.')).toBe('Intro\n\n');
    expect(closeStreaming('Intro\n\n##')).toBe('Intro\n\n');
    expect(closeStreaming('- one\n-')).toBe('- one\n');
  });

  it('closes inline syntax inside a list item or quote', () => {
    expect(closeStreaming('- an **item')).toBe('- an **item**');
    expect(closeStreaming('> a *quote')).toBe('> a *quote*');
  });

  it('closes an open link, and shows the text of a link that has no address yet', () => {
    expect(closeStreaming('See [the docs](https://quoin.te')).toBe('See [the docs](https://quoin.te)');
    expect(closeStreaming('See [the do')).toBe('See the do');
    expect(closeStreaming('See [the docs](')).toBe('See the docs');
  });

  it('leaves underscores inside words alone', () => {
    expect(closeStreaming('a snake_case name')).toBe('a snake_case name');
    expect(closeStreaming('an _emphasis')).toBe('an _emphasis_');
  });
});
