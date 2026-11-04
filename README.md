# flame-fe

Dashboard for **Flame**, the multi-guild Discord bot platform. It talks to `flame-be` through same-origin `/api`; in development Vite proxies that path to the API, in production the reverse proxy does. Product context and the API rules: `../flame-be/AGENTS.md`. Design system, page patterns and the rules for working on it: [AGENTS.md](./AGENTS.md).

Svelte 5 (runes) · Vite · twind · bits-ui · `@lucide/svelte` · hash router.

## Run it

```sh
npm install
npm run dev              # dashboard on :5173, /api proxied to http://localhost:3000
```

Start the backend first (`flame-be`, `npm run dev`), and make sure its `FRONTEND_URL` points here (default `http://localhost:5173`).

## Scripts

`npm run dev | build | preview | check`

`npm run check` runs `svelte-check`. TypeScript stays on `~6` here because `svelte-check` does not run on TS 7.
