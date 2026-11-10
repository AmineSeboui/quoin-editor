/** Every page of the site, by its path under the base, with whether it holds a live editor. */
export const sitePages: { path: string; live: boolean }[] = [
  { path: '', live: true },
  { path: 'blocks/', live: true },
  { path: 'collaboration/', live: true },
  { path: 'ai/', live: true },
  { path: 'comments/', live: true },
  { path: 'server-rendering/', live: false },
  { path: 'comparison/', live: false },
  { path: 'migration/', live: false },
  { path: 'changelog/', live: false },
  { path: '404.html', live: false },
];
