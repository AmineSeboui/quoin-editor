import { homePage } from '../site/pages';
import { NPM_URL, REPO_URL, SITE_NAME, SITE_URL } from '../site/site';

const PACKAGE_NAME = 'quoin-editor';

/** The schema.org description of the site and the package that the home page gives search engines, as JSON-LD. */
export function structuredData(): string {
  const graph = [
    { '@type': 'WebSite', name: SITE_NAME, alternateName: PACKAGE_NAME, url: SITE_URL },
    {
      '@type': 'SoftwareSourceCode',
      name: SITE_NAME,
      alternateName: PACKAGE_NAME,
      description: homePage.description,
      url: SITE_URL,
      codeRepository: REPO_URL,
      sameAs: [REPO_URL, NPM_URL],
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'React',
      license: 'https://opensource.org/licenses/MIT',
      keywords: ['markdown editor', 'rich text editor', 'block editor', 'React', 'real-time collaboration', 'AI'],
      author: { '@type': 'Person', name: 'Amine Sboui', url: 'https://github.com/AmineSeboui' },
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`;
}
