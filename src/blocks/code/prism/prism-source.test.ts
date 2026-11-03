type PrismGlobal = { Prism?: unknown };

const globals = globalThis as PrismGlobal;

const freshSource = async () => {
  vi.resetModules();
  return (await import('./prism-source')).prismSource;
};

afterEach(() => {
  delete globals.Prism;
});

describe('prismSource', () => {
  it('leaves no Prism on the global when the host kept none there', async () => {
    const source = await freshSource();
    await source.load();
    expect(globals.Prism).toBeUndefined();
  });

  it("puts back the host's own Prism, which the grammars would otherwise replace", async () => {
    const theirs = { manual: false, ofTheHost: true };
    globals.Prism = theirs;
    const source = await freshSource();
    await source.load();
    expect(globals.Prism).toBe(theirs);
  });

  it('loads a tokenizer that reads its own Prism, not the global', async () => {
    const source = await freshSource();
    const tokenize = await source.load();
    globals.Prism = { broken: true };
    expect(tokenize('const', 'typescript')).not.toBeNull();
  });

  it('shares one load between callers', async () => {
    const source = await freshSource();
    const [a, b] = await Promise.all([source.load(), source.load()]);
    expect(a).toBe(b);
  });
});
