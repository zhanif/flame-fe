# flame-fe Agent Rules

Dashboard for Flame (see `../AGENTS.md` for the product and `../flame-be/AGENTS.md` for the API). Svelte 5 (runes) · Vite · twind · `@lucide/svelte` · hash router · `$lib/*` alias (declared in **both** `tsconfig.json` and `vite.config.ts`).

Check with `npx svelte-check`. TypeScript stays on `~6` here because `svelte-check` does not run on TS 7. Do not write tests or run a browser agent unless asked.

## Layout

| Path | What lives there |
| --- | --- |
| `src/lib/pages/` | One file per page; `GuildLayout` is the sidebar shell for the guild pages. Sidebar: Dashboard, Settings, Audit logs, Slash. Modules are a section inside Dashboard (`OverviewPage` + `ModulesSection`), not a menu entry |
| `src/lib/components/` | Shared pieces: Button, Badge, Input, Card, Tile, Modal, Toasts, PageHeader, Pagination, RolePicker, skeletons. Class tokens (controls, table cells, tones) live in `src/lib/ui.ts` |
| `src/lib/stores/` | `session`, `bot`, `router`, `toast` (rune stores) |
| `src/lib/api/` | `client.ts` (fetch wrapper, `{data}`/`{error}` envelope) and `endpoints.ts` (typed calls) |

## Design system

Consistency comes from shared components and tokens (the shadcn idea: variants live in one component, pages only compose). **Never re-type a button, badge, input, card, or table cell style inline, use the primitive; if a variant is missing, add it to the primitive.**

| Primitive | Use |
| --- | --- |
| `Button` (`variant`: primary / soft / secondary / ghost / danger · `size`: sm `h-7` / md `h-8` / icon `h-7 w-7`, all `text-xs` · optional `href`) | Every button and button-looking link |
| `Badge` (`tone`: success / warning / danger / brand / info / accent / neutral) | Status pills and permission chips |
| `Input` (optional `icon`) + `control` / `label` tokens in `lib/ui.ts` | Text inputs; anything input-like (RolePicker, selects) reuses `control` |
| `Card` (`flush` for tables, `interactive` for hover lift on clickable cards) | Every panel |
| `Avatar` (`src`, `name`, `id`, `size`) | Server icon, falls back to a letter tile in the server's own color |
| `BoltSwitch` (`on`, `busy`, `danger`) | The Slash page's per-command register/remove switch (lightning-bolt knob). Update the row in place after a click, never reload the table |
| `Tile` | The boxed icon square. **Only the top bar (`PageHeader`) uses it.** Everywhere else an icon is plain: icon + text |
| `SectionTitle` (`icon`, `title`) | A section heading inside a page: small colored icon beside the title, nothing else. **No subtitle under section titles** |
| `th` / `td` tokens in `lib/ui.ts` | Table cells |

Scale (use these; no other arbitrary text sizes):

- **Spacing:** one outer unit, **`5` (20px)**: page padding (`main p-5`), `Card` padding (`p-5`), `Modal` padding (`p-5`), table cell/pagination horizontal padding (`px-5`), `PageHeader` gutter (`px-5`), and the gap between panels/grid cards (`gap-5` / `space-y-5`). Inside a panel use `4` for field groups, `3`/`2` for tight rows.
- **Radius:** `rounded-2xl` panels (Card, Modal, toast) · `rounded-xl` tiles and hero avatars · `rounded-lg` controls (Button, Input, select) · `rounded-md` chips and badges · `rounded-full` circular avatars only.
- **Control height:** inputs `h-9`; buttons `h-8` (sm and icon `h-7`), small on purpose.
- **Type:** `text-sm` body and inputs · `text-xs` table cells, descriptions, badges · `text-base font-semibold` modal titles · `text-sm font-semibold` card titles. All-caps text (labels, table headers via the `label`/`th` tokens) is `text-[11px] font-semibold uppercase tracking-wider`, the page title in the top bar `text-xs`; caps read larger, so they run a size below normal text.

## Theme, top bar, notifications, motion

- **Light/dark:** the `zinc` scale and the accent text shades (`orange`/`red`/`emerald`/`amber` 300 and 400) read CSS variables from `src/theme.css`; light mode mirrors the zinc scale, so use the normal classes and both themes work. Do not hard-code hex or `dark:` variants. `ThemeToggle` + `stores/theme.svelte.ts` own the switch (saved in `localStorage` under `flame:theme`, applied before first paint by `index.html`).
- **One color per page.** Icons inside a page (section titles, the `/` in command names) use that page's color from `nav.ts` via `pageTone()` (provided by `GuildLayout`), so the page matches its sidebar item. Do not pick a color per icon. Exceptions: status colors (success, error, live), server avatars, the Dashboard stat icons (Installed, Available, Roles, Channels each have their own color) and each module's icon (`toneFor(module.id)`); the "Modules" section title itself stays orange.
- **Tabs.** A page with several views (a module's Quotes list and its Settings) uses `Tabs` under the top bar and shows one view at a time; do not stack unrelated panels on one page. A settings field is a caps `label`, a one-line hint, then the control.
- **Module pages.** An installed module with a dashboard page gets an item in the sidebar section it declares (`section`: Management or Utilities). Add one by: an entry in `MODULE_PAGES` (label, icon, color) and `SECTIONS` in `nav.ts`, a component in `lib/modules/<id>/` registered in `lib/modules/views.ts`, and `<PageHeader module="<id>" ... />` on it. The page lives at `#/guild/<id>/m/<moduleId>`; its API is the module's own controller under `/guilds/:id/m/<moduleId>`. `moduleCatalog` (`stores/modules.svelte.ts`) is the single source of what is installed, shared by the sidebar and the Dashboard.
- **Page identity** (label, icon, color) is defined once in `src/lib/nav.ts`; the sidebar and `PageHeader` (`<PageHeader page="settings" description="..." />`) both read it, so the top bar icon always matches the sidebar. Add a new page there, not in each component.
- **Top bar** (`PageHeader`): page identity on the left, the theme toggle on the right. Nothing else. Page actions (Save, ...) live in the page content: a toolbar above the table or a right-aligned footer under the form.
- **Notifications:** `toast(kind, title, description?)` with kind `success` / `error` / `info`. Write a short title and, when it helps, one line saying what to do next. Toasts slide in, reorder smoothly, pause on hover, show a countdown bar, and can be dismissed. Do not build another notification style.
- **Motion:** use `svelte/transition` (`fly`, `fade`, `scale`) with short durations (150-280ms): toasts, modals (fade backdrop + scale dialog), page content on route change. `theme.css` disables animation under `prefers-reduced-motion`.

## Look & feel

- Style: modern and colorful but flat. **No gradients** (no `bg-gradient-*`, no gradient text, no glow blobs); color comes from flat tints, tinted icon `Tile`s, colored `Badge`s and the solid orange primary button. Orange is the brand; each area has its own tone (dashboard orange, settings sky, audit violet, slash emerald). Titles use the `font-display` class (Plus Jakarta Sans), body text Inter. Buttons stay small. Dark is an ash gray: neutral, no blue or purple tint (`--zinc-950` is `30 31 34`, cards and sidebar `zinc-900`); do not tint it and do not push surfaces darker. Sidebar icons are plain, colored per page, never dimmed. No helper sentences squeezed above tables, put the hint in a `title` tooltip instead.
- Palette: `zinc` for surfaces and text (page `zinc-950`, sidebar/modal/toast `zinc-900`, cards `zinc-800/40`), accents `orange` / `sky` / `violet` / `emerald` / `amber` / `red`. No slate or navy.
- **Orange is not for everything.** Solid orange (`primary`) is one action per view (Save, Log in). Actions inside cards and lists (Manage, Install) use `variant="soft"`. Icons without an image (server icons, module tiles) get a stable per-id color from `toneFor(id)` via `Avatar` / `Tile`, never a fixed orange.
- Shadows stay light: cards `shadow-sm` (hover `shadow-md`), primary button `shadow-sm` with a faint orange tint, floating layers (dropdown, toast, modal) at most `shadow-lg`/`shadow-xl`. No `shadow-2xl`, no colored glows on avatars.
- **Popover widgets use bits-ui** (headless Svelte 5 primitives, the base of shadcn-svelte): `Select` and `DateRangePicker` in `components/` wrap `Select`, `Popover` and `RangeCalendar` from `bits-ui` and style them with our tokens. Never use a native `<select>` or `<input type="date">` for user-facing filters. The floating panels, menu items and calendar cells are styled by data attributes (`data-highlighted`, `data-selected`, `data-selection-start`, ...) in `src/theme.css` (`.pop`, `.menu-item`, `.cal-cell`, `.cal-day`), so they follow light/dark. Need a combobox, dropdown menu, tooltip or dialog? Reach for the matching bits-ui part, not a new library. Dates are `@internationalized/date`.
- Twind quirk: with CSS-variable colors, opacity is ignored on `from-*` and on `ring-*/NN` inside variants (`focus:`, `hover:`). Use plain `bg-*/NN`, `border-*/NN` or static colors (`orange-500/..`) instead, and test new patterns before relying on them.
- The page header (`PageHeader`) is a bar exactly as tall as the sidebar's bot row (`h-[69px]`) so the two line up; keep them in step.
- Bot name and avatar come from `/bot/info`, never hard-coded.
- Actions happen on an explicit button click; destructive ones go through the confirm `Modal`.
- No em dashes or en dashes (long dash marks) in any text: UI copy, comments, docs, commit messages. Use a period, comma, colon or parentheses. For an empty cell use `-`; for ranges use `1-10`.
- Never show a "Loading…" text; use a skeleton for every loading state, including subtitles and labels that depend on loaded data.
- Skeleton loaders must match the real layout of the page (same columns, same padding). Loading must not flash disabled or locked states.

## Tables

Every table follows these rules; do not build a one-off table.

1. **`#` column first**: the row number across pages: `(page - 1) * limit + i + 1`. Narrow (`w-16`, which includes the cell padding), muted.
2. **Pagination** with `components/Pagination.svelte`: **first · prev · next · last as icon buttons (« ‹ › »), no text labels**, the `page / total` indicator, a `from-to of total` summary, and a **Rows** limit selector (10 / 20 / 50 / 100, default 10). Always render it when the table has rows, even for a single page, so the limit stays reachable.
3. Server-backed lists (e.g. audit logs) page on the server with `page` + `limit` query params. Short in-memory lists (e.g. slash commands) slice client-side with the same component.
4. Changing the limit resets to page 1. While a page loads, keep the current rows and disable the pagination; only the very first load shows the skeleton.
5. Compact density: wrap the table in `<Card flush>` (no card padding, table runs edge to edge); header cells use the `th` token, body cells the `td` token (`py-2.5 px-5`, so text lines up with other panels); rows are separated by `divide-y divide-zinc-800/30`.
6. The matching `TableSkeleton` lists the same columns, `#` included.
7. Empty state: no card, no table header. Use `EmptyState` (`kind`: server / commands / log / search / modules, a gray title and a gray hint: always the illustration, a title AND a hint, never a bare title). It is centered on both axes in the space left under the top bar. Add a new illustration to `EmptyArt` when a new `kind` is needed; never write a bare "No X yet" line.

## Module pages with roles and exceptions

`Toggle` is the switch for a setting that applies right away (one per flag in a table row); `BoltSwitch` stays for slash commands. `RoleExceptions` is the shared "people a role rule leaves alone" tab (users by id, roles by picker). `lib/modules/booster` and `lib/modules/anti-tamper` are the reference: Tabs for Roles, Exceptions and Settings, moderators read and admins change, bulk actions behind a confirm `Modal`. Sweep now is locked for now (a disabled button that says why). The endpoints that two modules share are built by `roleRules()` in `api/endpoints.ts`.

## Pickers

One choice is a dropdown you can type in: `ChannelPicker` (channels and threads) and `RoleSelect` (a role), both on `Combobox`. Several choices are chips in a box you can type in: `RolePicker` and `ChannelsPicker`, both on `ChipPicker`, which takes a `max` (a plan limit: at the limit the box says so and a chip has to be removed first). Number fields only accept digits (or one decimal dot): wire `restrictTo(onlyDigits | onlyDecimal, ...)` from `lib/number-input.ts`. A settings card is rows of `SettingRow`: the setting and its explanation on the left, the control on the right.
