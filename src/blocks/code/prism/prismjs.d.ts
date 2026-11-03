declare module 'prismjs/components/prism-core.js' {
  const Prism: {
    manual: boolean;
    languages: Record<string, unknown>;
    tokenize(code: string, grammar: object): unknown[];
  };
  export default Prism;
}

declare module 'prismjs/components/*';
