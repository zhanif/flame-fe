import type { GuildPage } from '$lib/stores/router.svelte';
import type { Tone } from '$lib/ui';
import type { ModuleSection } from '$lib/api/endpoints';
import { LayoutDashboard, Quote, ScrollText, Settings, Terminal } from '@lucide/svelte';
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
  audit: { label: 'Audit logs', icon: ScrollText, tone: 'violet', adminOnly: true },
  slash: { label: 'Slash', icon: Terminal, tone: 'emerald', adminOnly: true },
};

/** Label, icon and color of each installable module's page, by module id. */
export const MODULE_PAGES: Record<string, PageMeta> = {
  quotes: { label: 'Quotes', icon: Quote, tone: 'cyan', adminOnly: false },
};

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
