import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://qatar-settlement-hub.pages.dev',
  trailingSlash: 'always',
  build: {
    // Keep every script and stylesheet in its own file so the CSP needs no 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
