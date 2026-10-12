import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// The dashboard talks to flame-be through same-origin `/api` — in dev Vite
// proxies it, in production the reverse proxy does — so the session cookie
// never has to cross origins.
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
});
