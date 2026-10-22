# Qatar Settlement Hub

A free, private calculator for Qatar end-of-service gratuity, final settlement, overtime and "send money home". It is a static site with no backend: every calculation runs in the browser.

- **Spec:** [SPEC.md](SPEC.md)
- **Legal sources and open questions:** [LEGAL-VERIFY.md](LEGAL-VERIFY.md)

## Languages
English, Arabic, Hindi, Malayalam, Nepali, Bengali, Filipino, Urdu, Tamil and Sinhala, at `/<code>/`. Arabic and Urdu are right-to-left. Only English is marked as reviewed; every other language shows a "machine-assisted translation" note in the footer until a native speaker checks it. To mark a language as reviewed, set `reviewed: true` in `src/i18n/index.ts`.

To add a language:
1. Copy `src/i18n/en.ts` to `<code>.ts`, typed as `Dict`.
2. Register it in `src/i18n/index.ts`.
3. Add its font in `src/styles/global.css` if it uses a new script.

`npm test` fails if any key or `{placeholder}` is missing.

## Commands
```bash
npm install
npm run dev      # http://localhost:4321
npm test         # engine + translation tests (Vitest)
npm run build    # static site in dist/
```

## Where things live
| Path | What |
|---|---|
| `src/rules/qatar.ts` | Every legal constant, with its article and verified flag |
| `src/engine/` | Pure calculation code (settlement, overtime, remittance) + tests |
| `src/i18n/` | Dictionaries for the 10 languages |
| `src/config/monetization.ts` | Money-transfer partners and affiliate links |
| `src/config/fxFallback.ts` | Offline exchange rates |
| `src/scripts/` | Browser code for each page |
| `src/config/official.ts` | Links to the Ministry of Labour and the Labour Law text |
| `public/_headers` | Security headers (strict CSP), applied by Cloudflare |
| `wrangler.jsonc` | Cloudflare Workers config: serves `dist/` as static files |

## Deployment
Live at https://qatar-settlement-hub.qatarhub.workers.dev/ on Cloudflare Workers, connected to this GitHub repo. Every push to `main` rebuilds and publishes automatically.

Cloudflare's build settings: build command `npm run build`, deploy command `npx wrangler deploy`, and variable `NODE_VERSION=22`.

If the address changes (for example, a custom domain), update `site` in `astro.config.mjs`, because it's used for canonical and hreflang links. Add HSTS `preload` only once the domain is final.

## Differences from SPEC.md
- The interactive parts are plain TypeScript modules rather than Preact islands. Each page ships about 20 KB of JavaScript.
- There are 10 languages instead of 2.
