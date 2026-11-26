# Skeletons

A skeleton is a **mirror of the view it stands in for**: same panels, same columns, same padding, same
control sizes, in the same order. It is not a generic placeholder. Match the real markup so nothing shifts
when the data arrives, and so loading never flashes an empty, disabled or locked state.

The bar: if someone saw only the skeleton and then the real view, the difference should be the contents of a
few boxes, not the shape.

## Use what the page already knows

Draw what is already true, bar only what is still coming:

- Headings, caps labels, section titles, tab names, filter options, the page title and icon: draw them.
- A number still loading: a bar. A pill still loading: a pill shape, not a bar.
- A control whose **content** depends on the data (a picker, a button that needs the list, a count in a tab):
  a `ControlSkeleton`. A control whose content is static (tabs, a Refresh button, a segmented control with
  fixed options, a section title): draw it normally.
- Expected counts and where the page is inside itself come from the address (`?page`, `?tab`, `?config`) or
  from `sessionStorage` (the last visit's row count), never invented.

Never render a fake interactive control (a clickable segmented control that does nothing). Prefer bars, or the
real non-interactive text.

Add `aria-hidden="true"` to every skeleton root.

## Building blocks

| Component | For | Key props |
| --- | --- | --- |
| `TableSkeleton` | A table body | `columns`, `rows`, `rowHeight`, `headings`, `kinds` |
| `ControlSkeleton` | One data-dependent control | `class`, `h` (`h-8` button, `h-9` input) |
| `FormSkeleton` | A plain form | `fields`, `grid`, `hint`, `button` |
| `Card` + bars | Any panel: wrap `rounded-2xl border ... bg-zinc-900` with `p-5` | bit by bit |
| `PageHeaderSkeleton` | The top bar (drawn once by the layout) | `page`, `module` |
| `ModulePageSkeleton` | A module page's body before it mounts | `module`, `guildId`, `isAdmin` |
| `SettingsSkeleton` | The guild Settings page | - |

`TableSkeleton` is the workhorse. `columns` is one width class per column (`w-24`, `flex-1`), prefix `>` to
right-align. `headings` replaces a header bar with the real caps title (pass `''` for an action column).
`kinds` shapes each body cell:

| kind | shape |
| --- | --- |
| `bar` | a text line (default) |
| `text` | a two-line cell: a title bar over a smaller subtext bar |
| `thumb` | a 14x14 preview square |
| `actor` | an avatar with two lines (a member) |
| `pill` | a status badge |
| `toggle` | a switch |
| `action` | one icon button |
| `actions` | two icon buttons (edit + remove) |

Everything a table can know should be passed ([see the invasion items table](../src/lib/modules/invasion/ItemsTab.svelte)).

## The same shape before mount

While a module's catalog is still loading, `GuildLayout` cannot mount the page yet, so it renders
`ModulePageSkeleton` (after `PageHeaderSkeleton`). That skeleton must be the **same shape** the page will draw,
or the page swaps one skeleton for another on the way in.

- A module with a bespoke body adds a branch to `ModulePageSkeleton` and delegates to its own skeleton
  (`BingoSkeleton`, `ChatCompletionSkeleton`, `InvasionPageSkeleton`).
- The generic branch draws a tabs row (from the `TABS` map) over a four-column table. That is a fallback, not
  a target: a real page should replace it with its own shape.

Keep the "shape" a module page and its pre-mount skeleton share in **one component each**:

- `InvasionSkeleton` (`view: 'statistic' | 'settings'`) is the tab body.
- `InvasionPageSkeleton` is the whole page: the tabs row plus the body for the `?tab` / `?config` in the URL.
- `ItemConfigSkeleton` (`section`, `isAdmin`) is one item-config panel; `ItemConfig` renders it while its
  definitions load, and the page skeleton reuses it.

When a real view and its skeleton share text (a section title, a description), export it once and import it
in both: see [`item-config.ts`](../src/lib/modules/invasion/item-config.ts) (`ITEM_CONFIG_SECTIONS`).

## Walkthrough

1. **Open the real view** and list its pieces top to bottom: toolbar, panels, tables, footer.
2. **Decide the loading gate.** Which value, once null, means "not ready"? (`items`, `defs`, `config`.)
   Render the skeleton for that gate only; never mix it with empty-state text.
3. **Copy the layout.** Reuse the real wrapper classes (`Card`, `space-y-5`, the grid, `p-5`, `gap-5`).
4. **Tables**: `TableSkeleton` with the real `columns`, `headings`, `kinds`, `rowHeight`, and a `rows` count
   the page expects. The `#` column is included.
5. **Controls**: static ones drawn, data-dependent ones a `ControlSkeleton` of the right width and `h`.
6. **Sibling views**: if the page has tabs or a drill-down, give each its own shape, chosen from the URL, so a
   reload and a link show the right skeleton immediately.
7. **Empty vs loading**: an empty state (`EmptyState`) is for loaded-and-empty; a skeleton is for loading.
   Never show "No X yet" while the data is still coming.

## Checklist

- [ ] Same panels, columns, padding and control sizes as the real view.
- [ ] Real headings, labels and titles drawn; only unknown values are bars.
- [ ] Data-dependent controls are `ControlSkeleton`s; no disabled or locked flash.
- [ ] Rows the page expects (address or `sessionStorage`), `#` included.
- [ ] Each tab or drill-down has its own shape, picked from the URL.
- [ ] `aria-hidden="true"` on the root.
- [ ] `ScrollPanel` hint muted (`hideHint`) while a skeleton is inside it.
- [ ] The pre-mount shape (`ModulePageSkeleton`) matches the page; add a branch when the page is bespoke.
- [ ] No em or en dashes in any of it.
