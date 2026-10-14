import AntiTamperPage from '$lib/modules/anti-tamper/AntiTamperPage.svelte';
import BoosterPage from '$lib/modules/booster/BoosterPage.svelte';
import QuotesPage from '$lib/modules/quotes/QuotesPage.svelte';
import type { Component } from 'svelte';

/** The dashboard page of each installable module, by module id. A module without an
 *  entry here is still installable; it just has no page of its own in the sidebar. */
export const MODULE_VIEWS: Record<string, Component<{ guildId: string; isAdmin: boolean }>> = {
  quotes: QuotesPage,
  booster: BoosterPage,
  'anti-tamper': AntiTamperPage,
};
