// Shared class tokens. Components and pages compose these instead of
// re-typing colors, radii and sizes, change a look here, not per page.

/** Text inputs, selects, and anything that behaves like one (RolePicker). */
export const control =
  'rounded-lg bg-zinc-950/60 border border-zinc-700 text-zinc-200 placeholder-zinc-500 outline-none transition focus:border-orange-500/60 disabled:opacity-60';

/** All-caps text (labels, table headers) runs a size below `text-xs`: caps read bigger. */
export const caps = 'text-[11px] font-semibold uppercase tracking-wider';

/** Form field caption. */
export const label = `block mb-1.5 ${caps} text-zinc-400`;

/** Table cells: fixed row heights (so badge rows and text rows match) and `px-5` like Card.
 *  Widths on a cell include its padding; the `#` column is `w-16`. */
export const th = `h-10 px-5 text-left align-middle ${caps} text-zinc-500`;
export const td = 'h-11 px-5 align-middle text-xs';


/** The accent palette: orange is the brand, the rest give each area its own color. */
export type Tone = 'orange' | 'sky' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'fuchsia' | 'red';

/** A stable "random" tone for an id (a server, a module): same id, same color, everywhere. */
const RANDOM_TONES: Tone[] = ['sky', 'violet', 'amber', 'emerald', 'orange'];
export const toneFor = (id: string): Tone => RANDOM_TONES[[...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % RANDOM_TONES.length];

/** Flat tinted icon tile per tone (see Tile). */
export const tile: Record<Tone, string> = {
  orange: 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30',
  sky: 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30',
  violet: 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-400 ring-1 ring-fuchsia-500/30',
  red: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
};

/** Plain icon color per tone (sidebar icons, inline accents). */
export const toneText: Record<Tone, string> = {
  orange: 'text-orange-400',
  sky: 'text-sky-400',
  cyan: 'text-cyan-400',
  violet: 'text-violet-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  fuchsia: 'text-fuchsia-400',
  red: 'text-red-400',
};
