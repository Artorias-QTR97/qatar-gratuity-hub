import type { APIRoute } from 'astro';
import { LANGUAGES } from '../i18n';
import { RULES } from '../rules/qatar';

// One <url> per page per language, each listing all its language alternates (hreflang).
const PAGES = ['', 'overtime/', 'privacy/'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://example.com');
  const href = (lang: string, path: string) => new URL(`/${lang}/${path}`, base).href;

  const urls = PAGES.flatMap((path) =>
    LANGUAGES.map((lang) => {
      const alternates = LANGUAGES.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt.code}" href="${href(alt.code, path)}"/>`,
      ).join('\n');
      return `  <url>
    <loc>${href(lang.code, path)}</loc>
    <lastmod>${RULES.lastLegalReview}</lastmod>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${href('en', path)}"/>
  </url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${new URL('/', base).href}</loc>
    <lastmod>${RULES.lastLegalReview}</lastmod>
  </url>
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
