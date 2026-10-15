# flame-fe Agent Rules

Dashboard for Flame (see `../AGENTS.md` for the product and `../flame-be/AGENTS.md` for the API). Svelte 5 (runes) · Vite · twind · bits-ui · `@lucide/svelte` · hash router · `$lib/*` alias (declared in **both** `tsconfig.json` and `vite.config.ts`).

Check with `npx svelte-check`. TypeScript stays on `~6` here because `svelte-check` does not run on TS 7. Do not write tests or run a browser agent unless asked.

## Layout

| Path | What lives there |
| --- | --- |
| `src/lib/pages/` | One file per page: Landing, Dashboard (server list), Privacy, Terms, and for a server `GuildLayout` (the sidebar shell), `OverviewPage` (stats and the module cards, `ModulesSection`), `SettingsPage`, `AuditPage`, `SlashPage`. Sidebar: Dashboard, Settings, Audit logs, Slash, then a section per module group (Management, Utilities) listing the installed modules that have a page |
| `src/lib/modules/<id>/` | One page per module (`<Name>Page.svelte`), registered in `views.ts`. Reference pages: `booster` and `anti-tamper` (roles and exceptions), `file-submissions` (cards, drill-down, review), `role-colors` (table with accordions, color picker) |
| `src/lib/components/` | Shared pieces (see the table below). Class tokens (controls, table cells, tones) live in `src/lib/ui.ts` |
| `src/lib/stores/` | `session`, `bot`, `router` (hash path and `?query`), `toast`, `theme`, `modules` (the catalog of what is installed and on) |
| `src/lib/api/` | `client.ts` (fetch wrapper, `{data}`/`{error}` envelope) and `endpoints.ts` (typed calls and the types they return) |
| `src/lib/nav.ts` | Page identity (label, icon, tone) for core pages and module pages, sidebar order and sections |

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
| `ConfirmModal` | Every confirmation before removing, stopping or overwriting something |
| `RowMenu` (items: label, icon, `danger`, `disabled`, `hint`) | The vertical three-dot menu for three or more row or card actions |
| `RoleChip` · `ActorCell` · `AvatarStack` · `ColorChips` | A role in its color, a member (avatar, name, id), a few members or roles as overlapping circles, a list of hex colors with swatches |
| `ColorField` · `ChatPreview` | A color to pick (swatch that opens the system picker, hex box, presets) and a Discord-style message preview in the colors being chosen (the one place a gradient is allowed) |
| `InfoPanel` | The "how it works" panel behind a module's Info button |
| `Toggle` · `SettingRow` · `WarningBanner` | A switch for a setting that applies right away; a settings row (text left, control right); the warning strip (hidden while the module is off) |
| `TableSkeleton` · `FormSkeleton` · `ControlSkeleton` · `PageHeaderSkeleton` · `ModulePageSkeleton` | Skeletons: see "Skeletons are smart" below |

Scale (use these; no other arbitrary text sizes):

- **Spacing:** one outer unit, **`5` (20px)**: page padding (`main p-5`), `Card` padding (`p-5`), `Modal` padding (`p-5`), table cell/pagination horizontal padding (`px-5`), `PageHeader` gutter (`px-5`), and the gap between panels/grid cards (`gap-5` / `space-y-5`). Inside a panel use `4` for field groups, `3`/`2` for tight rows.
- **Radius:** `rounded-2xl` panels (Card, Modal, toast) · `rounded-xl` tiles and hero avatars · `rounded-lg` controls (Button, Input, select) · `rounded-md` chips and badges · `rounded-full` circular avatars only.
- **Control height:** inputs `h-9`; buttons `h-8` (sm and icon `h-7`), small on purpose.
- **Type:** `text-sm` body and inputs · `text-xs` table cells, descriptions, badges · `text-base font-semibold` modal titles · `text-sm font-semibold` card titles. All-caps text (labels, table headers via the `label`/`th` tokens) is `text-[11px] font-semibold uppercase tracking-wider`, the page title in the top bar `text-xs`; caps read larger, so they run a size below normal text.

## Theme, top bar, notifications, motion

- **Light/dark:** the `zinc` scale and the accent text shades (`orange`/`red`/`emerald`/`amber` 300 and 400) read CSS variables from `src/theme.css`; light mode mirrors the zinc scale, so use the normal classes and both themes work. Do not hard-code hex or `dark:` variants. `ThemeToggle` + `stores/theme.svelte.ts` own the switch (saved in `localStorage` under `flame:theme`, applied before first paint by `index.html`).
- **One color per page.** Icons inside a page (section titles, the `/` in command names) use that page's color from `nav.ts` via `pageTone()` (provided by `GuildLayout`), so the page matches its sidebar item. Do not pick a color per icon. Exceptions: status colors (success, error, live), server avatars, the Dashboard stat icons (Installed, Available, Roles, Channels each have their own color) and each module's icon (`toneFor(module.id)`); the "Modules" section title itself stays orange.
- **Tabs.** A page with several views (a module's Quotes list and its Settings) uses `Tabs` under the top bar and shows one view at a time; do not stack unrelated panels on one page. A settings field is a caps `label`, a one-line hint, then the control.
- **Module pages.** An installed module with a dashboard page gets an item in the sidebar section it declares (`section`: Management or Utilities). Add one by: an entry in `MODULE_PAGES` (label, icon, color) and `SECTIONS` in `nav.ts`, a component in `lib/modules/<id>/` registered in `lib/modules/views.ts`, and `<PageHeader module="<id>" ... />` on it. The page lives at `#/guild/<guildId>/m/<moduleId>`; its API is the module's own controller under `/guilds/:id/m/<moduleId>`. `moduleCatalog` (`stores/modules.svelte.ts`) is the single source of what is installed, shared by the sidebar and the Dashboard.
- **Page identity** (label, icon, color) is defined once in `src/lib/nav.ts`; the sidebar and `PageHeader` (`<PageHeader page="settings" description="..." />`) both read it, so the top bar icon always matches the sidebar. Add a new page there, not in each component.
- **Top bar** (`PageHeader`): page identity on the left, the theme toggle on the right. Nothing else. Page actions (Save, ...) live in the page content: a toolbar above the table or a right-aligned footer under the form.
- **Notifications:** `toast(kind, title, description?)` with kind `success` / `error` / `info`. Write a short title and, when it helps, one line saying what to do next. Toasts slide in, reorder smoothly, pause on hover, show a countdown bar, and can be dismissed. Do not build another notification style.
- **Motion:** use `svelte/transition` (`fly`, `fade`, `scale`) with short durations (150-280ms): toasts, modals (fade backdrop + scale dialog), page content on route change. `theme.css` disables animation under `prefers-reduced-motion`.

## Look & feel

- Style: modern and colorful but flat. **No gradients** (no `bg-gradient-*`, no gradient text, no glow blobs); color comes from flat tints, tinted icon `Tile`s, colored `Badge`s and the solid orange primary button. Orange is the brand; each area has its own tone (dashboard orange, settings sky, audit violet, slash emerald; modules: quotes cyan, booster fuchsia, anti-tamper red, autoremover green, ocr-detection blue, file-submissions amber, role-colors lime, announcements teal, chat-completion vermilion, a red that leans orange; its 300, 400 and 500 shades are themed). A new module gets a tone nobody uses yet, added to `Tone`, the tile, text and `Badge` maps in `ui.ts`/`Badge.svelte`, `main.ts` (accent) and both themes in `theme.css`. Titles use the `font-display` class (Plus Jakarta Sans), body text Inter. Buttons stay small. Dark is an ash gray: neutral, no blue or purple tint (`--zinc-950` is `30 31 34`, cards and sidebar `zinc-900`); do not tint it and do not push surfaces darker. Sidebar icons are plain, colored per page, never dimmed. No helper sentences squeezed above tables, put the hint in a `title` tooltip instead. **Where a page is inside itself lives in the URL**, as `?key=value` after the hash path (`router.query`, `router.setQuery({ key: value | null })`): the open item, the round, the filter, the page number. A link or a reload opens the same place and Back goes one step. State a page derives from the URL is not copied into local `$state`; a load effect follows the URL (see `FileSubmissionsPage`). **A status pill (`Badge`) stands alone in its cell: no text under it (no date, no "by whom"); anything more goes in its own column or in the detail view.** Table rows show the essentials only; who reviewed and when belong in the preview/detail modal.
- Palette: `zinc` for surfaces and text (page `zinc-950`, sidebar/modal/toast `zinc-900`, cards `zinc-900`), accents `orange` / `sky` / `cyan` / `violet` / `emerald` / `amber` / `fuchsia` / `green` / `blue` / `lime` / `red`. No slate or navy. Only the 300 and 400 shades of an accent follow the light/dark variables; any other shade (`sky-200`) stays fixed and may be unreadable in light mode.
- **Orange is not for everything.** Solid orange (`primary`) is one action per view (Save, Log in). Actions inside cards and lists (Manage, Install) use `variant="soft"`. Icons without an image (server icons, module tiles) get a stable per-id color from `toneFor(id)` via `Avatar` / `Tile`, never a fixed orange.
- Shadows stay light: cards `shadow-sm` (hover `shadow-md`), primary button `shadow-sm` with a faint orange tint, floating layers (dropdown, toast, modal) at most `shadow-lg`/`shadow-xl`. No `shadow-2xl`, no colored glows on avatars.
- **Popover widgets use bits-ui** (headless Svelte 5 primitives, the base of shadcn-svelte): `Select` and `DateRangePicker` in `components/` wrap `Select`, `Popover` and `RangeCalendar` from `bits-ui` and style them with our tokens. Never use a native `<select>` or `<input type="date">` for user-facing filters. The floating panels, menu items and calendar cells are styled by data attributes (`data-highlighted`, `data-selected`, `data-selection-start`, ...) in `src/theme.css` (`.pop`, `.menu-item`, `.cal-cell`, `.cal-day`), so they follow light/dark. Need a combobox, dropdown menu, tooltip or dialog? Reach for the matching bits-ui part, not a new library. Dates are `@internationalized/date`.
- Twind quirk: with CSS-variable colors, opacity is ignored on `from-*` and on `ring-*/NN` inside variants (`focus:`, `hover:`). Use plain `bg-*/NN`, `border-*/NN` or static colors (`orange-500/..`) instead, and test new patterns before relying on them.
- The page header (`PageHeader`) is a bar exactly as tall as the sidebar's bot row (`h-[69px]`) so the two line up; keep them in step.
- Bot name and avatar come from `/bot/info`, never hard-coded.
- Actions happen on an explicit button click; destructive ones go through `ConfirmModal` (see below).
- No em dashes or en dashes (long dash marks) in any text: UI copy, comments, docs, commit messages. Use a period, comma, colon or parentheses. For an empty cell use `-`; for ranges use `1-10`.
- Never show a "Loading..." text; use a skeleton for every loading state, including subtitles and labels that depend on loaded data.
- Skeleton loaders must match the real layout of the page (same columns, same padding). Loading must not flash disabled or locked states.
- **Skeletons are smart: use everything the page already knows.** A `TableSkeleton` passes the real `headings` (text, not bars) and a `kinds` per column (`thumb`, `actor`, `pill`, `toggle`, `action(s)`) so rows have the shape of the real ones, and `rows` is the count the page expects (what the parent list already says, or what the last visit showed via `sessionStorage`). Columns that exist only for admins are left out of the skeleton for everyone else. A control whose content depends on loaded data (a filter with its options, a button that needs the list, a tab's count) is a `ControlSkeleton` (tabs show a small pulse while `count` is `null`); controls that do not depend on data are drawn normally. Forms use `FormSkeleton` with `grid` / `hint` to match the real field layout. Every new page or module ships with this.

## Tables

Every table follows these rules; do not build a one-off table.

1. **`#` column first**: the row number across pages: `(page - 1) * limit + i + 1`. Narrow (`w-16`, which includes the cell padding), muted.
2. **Pagination** with `components/Pagination.svelte`: **first · prev · next · last as icon buttons (« ‹ › »), no text labels**, the `page / total` indicator, a `from-to of total` summary, and a **Rows** limit selector (10 / 20 / 50 / 100, default 10). Always render it when the table has rows, even for a single page, so the limit stays reachable.
3. Server-backed lists (e.g. audit logs) page on the server with `page` + `limit` query params. Short in-memory lists (e.g. slash commands) slice client-side with the same component.
4. Changing the limit resets to page 1. While a page loads, keep the current rows and disable the pagination; only the very first load shows the skeleton.
5. Compact density: wrap the table in `<Card flush>` (no card padding, table runs edge to edge); header cells use the `th` token, body cells the `td` token (`py-2.5 px-5`, so text lines up with other panels); rows are separated by `divide-y divide-zinc-800/30`.
6. The matching `TableSkeleton` lists the same columns, `#` included.
7. Empty state: no card, no table header. Use `EmptyState` (`kind`: server / commands / log / search / modules, a gray title and a gray hint: always the illustration, a title AND a hint, never a bare title). It is centered on both axes in the space left under the top bar. Add a new illustration to `EmptyArt` when a new `kind` is needed; never write a bare "No X yet" line.

## Module cards and on/off

`ModulesSection` is a grid of calm cards: the module's colored icon and name, a `Toggle` (on/off, admins only; turning off asks first, turning on does not) and a `RowMenu` (Open, Slash commands, Audit logs, Uninstall; moderators only see Open). The description sits under it and the commands are behind a "n commands" disclosure. No badges, no On/Off text. A module that is off is dimmed (icon, name, description) and, on its own page, shows a sky "Turned off" strip under the top bar and hides its `WarningBanner`s. Slash and Audit open filtered to the module through the URL (`router.guild(id, 'slash', { module })`).

## Module pages with roles and exceptions

`Toggle` is the switch for a setting that applies right away (one per flag in a table row); `BoltSwitch` stays for slash commands. `RoleExceptions` is the shared "people a role rule leaves alone" tab (users by id, roles by picker). `lib/modules/booster` and `lib/modules/anti-tamper` are the reference: Tabs for Roles, Exceptions and Settings, moderators read and admins change, bulk actions behind a confirm `Modal`. Sweep now is locked for now (a disabled button that says why). The endpoints that two modules share are built by `roleRules()` in `api/endpoints.ts`.

## Pickers

One choice is a dropdown you can type in: `ChannelPicker` (channels and threads) and `RoleSelect` (a role), both on `Combobox`. Several choices are chips in a box you can type in: `RolePicker` and `ChannelsPicker`, both on `ChipPicker`, which takes a `max` (a plan limit: at the limit the box says so and a chip has to be removed first). Number fields only accept digits (or one decimal dot): wire `restrictTo(onlyDigits | onlyDecimal, ...)` from `lib/number-input.ts`. A settings card is rows of `SettingRow`: the setting and its explanation on the left, the control on the right.

## Be smart about feedback: generalize, then check

A correction on one page is almost never about that page only. Before answering, find every other place with the same element and fix them together, then say what else changed.

- **Search for siblings.** After a style or behavior correction, `grep` the other pages and modules for the same pattern (a role shown as text, a member shown inline, an edit form, a skeleton, a `Kurama` word in a placeholder) and bring them all in line in the same change. The user should not have to repeat a request page by page.
- **Second use means a shared component.** The moment a look is needed twice, it becomes a primitive in `src/lib/components/` (`RoleChip` for a role in its color, `ActorCell` for a member, `ControlSkeleton`, `PageHeaderSkeleton`, ...) and every page uses it. Never copy the markup or the color helpers.
- **Row actions: one or two stay icon buttons, three or more go behind a vertical three-dot `RowMenu`** (items with icon, optional `danger`/`disabled`/`hint`), in tables and cards alike. A history/list of changes shows hex codes next to color swatches (`ColorChips`).
- **Anything that removes, stops or overwrites asks first, through `ConfirmModal`** (title, what goes away and what stays, a danger confirm button, busy state): removing a rule, role, exception or collection, cancelling a scheduled deletion, clearing colors, turning a module off, uninstalling, removing a command no module owns, pruning. Never act on the click. Reversible, explicit toggles (a switch the owner flips on purpose) and things that already ask in their own modal (reject with a reason, delete a quote) do not need a second one.
- **The Info panel explains how a module works, not how to configure it.** A view that has nothing to add from the dashboard (a command to run, a message to right-click, a log, settings) has an `Info` button at the far right of its toolbar that opens an `InfoPanel` the way Add opens its panel; a view with an Add button has no Info, since the button already shows what to do: numbered steps of what happens from the trigger to the result (a message arrives, it is queued, a background task reads it, a moderator answers), in plain words, with the module's tone. Settings are explained where they are set; a step only shows a command when typing it is part of how the module works. **The hint belongs to the section in front of the person**: a page with tabs or levels (collection, round) has a different hint for each (`HINTS[tab]`), covering only that section and never repeating another's, and it closes when the person moves to another level.
- **Every form saves with `SaveButton`** (icon, "Save changes", "Saving…" while it runs). Never type a Save button by hand.
- **Every module page warns, in orange, about the permissions its features need** (`WarningBanner` fed by the module's view `warnings`: server permissions through `roleOps.permissionWarnings`, per channel through `channelChecks.missing`). A picker item the bot cannot use is dimmed with a short reason (`problems.ts`): a role above the bot gets a lock, an integration role a link, a missing permission only the dimming, since the banner says what to grant.
- **Edit is an accordion, create is a panel.** Adding something opens the panel above the list (slide animation, button at the far right of the toolbar). Editing something opens its form **inside the thing being edited**: in the card for card/panel lists, in an extra `colspan` row right under the row for tables, with the same slide animation, a toggling pencil button and a `Cancel`. The form itself is one `{#snippet}` used by both. Never open the creation panel for an edit.
- **Generic, never Kurama.** Placeholders, examples, empty states and descriptions are neutral ("Weekly Contest", "Gold Member"). No `bingo`, `meme` or other Kurama vocabulary in Flame text, code comments or docs, except in the plan doc where it describes Kurama itself.
- **Reflect state in the URL.** Where a page is inside itself (the open item, round, tab, filter, page number) is `?key=value`, and the view is decided from the URL, not from loaded data, so a link and a reload show the right skeleton and the right breadcrumb immediately. Use `urlParam('key', fallback)` and `urlNumber('key')` (`lib/url-param.ts`): `bind:value={tab.value}` works on them, a value equal to the fallback stays out of the address, and `router.setQuery` updates the route at once. Page, size, tab, filter, search, the open row and what it is open for are all state of this kind; data is read in an `$effect` that follows them (not in the click handler), so Back and a pasted link load the right thing. Drafts being typed into a form are not.
- **Skeletons use what the page already knows** (real headings, row shapes, expected counts, the real page title and icon from the address) and cover controls that depend on data. See Look & feel.
- **A status `Badge` stands alone**, with no text under it; people shown like the submitter (avatar, name, id) use `ActorCell` for every role in the flow (submitter, reviewer, author, actor).
- **Verify what you change.** After an edit that touches many files, run `svelte-check` and re-`grep` for the pattern you were fixing; do not report a sweep as done before the grep comes back clean.

## Module page patterns

- **Toolbar:** tabs (or a breadcrumb) on the left, on the right the primary action (Add) and an Info button. Counts in tabs are optional; do not show a count for its own sake.
- **Lists of a few things** (collections) are long panels, not a table: identity left, essentials in the middle, related things (roles) right, actions at the end. Lists of many things are tables.
- **Drill-down** (collection, round, entries) is decided from the URL (`c`, `tag`, `e`, `page`, ...), with a breadcrumb that shows even before the data has loaded.
- **Add** opens a panel above the list; **edit** is an accordion inside the thing; **apply/history/info-like secondary forms** are accordions under the row too, each a `{#snippet}` or its own block, switched by a `mode`.
- **People and roles** are shown as `ActorCell` and `RoleChip`; several of them as an `AvatarStack` with a text summary ("2 users, 1 role").
- **Free-plan limits** are shown where they bite (the "n of 3 collections" counter next to Add) and enforced by the API.
- **Router:** `router.query` / `router.setQuery(patch)` for state, `router.guild(id, page, query)` and `router.module(id, moduleId)` to navigate.
