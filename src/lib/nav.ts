import type { GuildPage } from '$lib/stores/router.svelte';
import type { Tone } from '$lib/ui';
import type { ModuleSection } from '$lib/api/endpoints';
import { Images, LayoutDashboard, Palette, Quote, Rocket, ScanText, ScrollText, Settings, ShieldAlert, Terminal, Timer } from '@lucide/svelte';
import { type Component, getContext, setContext } from 'svelte';

export interface PageMeta {
  label: string;
  icon: Component<any>;
  tone: Tone;
  adminOnly: boolean;
}

// The one place a guild page's label, icon and color are defined. The sidebar
// and the top bar both read it, so they can never disagree.
export const PAGES: Record<GuildPage, PageMeta> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, tone: 'orange', adminOnly: false },
  settings: { label: 'Settings', icon: Settings, tone: 'sky', adminOnly: false },
  audit: { label: 'Audit Logs', icon: ScrollText, tone: 'violet', adminOnly: true },
  slash: { label: 'Slash', icon: Terminal, tone: 'emerald', adminOnly: true },
};

/** Label, icon and color of each installable module's page, by module id. */
export const MODULE_PAGES: Record<string, PageMeta> = {
  quotes: { label: 'Quotes', icon: Quote, tone: 'cyan', adminOnly: false },
  booster: { label: 'Booster', icon: Rocket, tone: 'fuchsia', adminOnly: false },
  'anti-tamper': { label: 'Anti Tamper', icon: ShieldAlert, tone: 'red', adminOnly: false },
  autoremover: { label: 'Autoremover', icon: Timer, tone: 'green', adminOnly: false },
  'ocr-detection': { label: 'OCR Detection', icon: ScanText, tone: 'blue', adminOnly: false },
  'file-submissions': { label: 'File Submissions', icon: Images, tone: 'amber', adminOnly: false },
  'role-colors': { label: 'Role Colors', icon: Palette, tone: 'lime', adminOnly: false },
};

/** The color of an audit action (`booster.role.save`, `quote.delete`...): the color of the page it
 *  belongs to, so a log row matches its module in the sidebar. Module actions start with the
 *  module's id (Quotes uses the singular `quote`); core ones with their page (`slash`, `settings`). */
export function actionTone(action: string): Tone {
  const prefix = action.split('.')[0];
  const moduleId = Object.keys(MODULE_PAGES).find(id => id === prefix || id === `${prefix}s`);
  if (moduleId) return MODULE_PAGES[moduleId].tone;
  if (prefix === 'module') return PAGES.dashboard.tone;
  if (prefix === 'slash') return PAGES.slash.tone;
  if (prefix === 'settings') return PAGES.settings.tone;
  return PAGES.audit.tone;
}

/** Sidebar sections that hold installed modules, in order. */
export const SECTIONS: { id: ModuleSection; label: string }[] = [
  { id: 'management', label: 'Management' },
  { id: 'utilities', label: 'Utilities' },
];

/** Sidebar order. */
export const NAV_ORDER: GuildPage[] = ['dashboard', 'settings', 'audit', 'slash'];

const TONE_KEY = Symbol('page-tone');

/** Called once by the layout: everything inside the page shares the page's color. */
export function providePageTone(get: () => Tone): void {
  setContext(TONE_KEY, get);
}

/** The color of the page being viewed (same as its sidebar item). Call during component init. */
export function pageTone(): () => Tone {
  return getContext<(() => Tone) | undefined>(TONE_KEY) ?? (() => 'orange');
}
