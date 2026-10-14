import AntiTamperPage from '$lib/modules/anti-tamper/AntiTamperPage.svelte';
import AutoremoverPage from '$lib/modules/autoremover/AutoremoverPage.svelte';
import BoosterPage from '$lib/modules/booster/BoosterPage.svelte';
import OcrDetectionPage from '$lib/modules/ocr-detection/OcrDetectionPage.svelte';
import FileSubmissionsPage from '$lib/modules/file-submissions/FileSubmissionsPage.svelte';
import RoleColorsPage from '$lib/modules/role-colors/RoleColorsPage.svelte';
import QuotesPage from '$lib/modules/quotes/QuotesPage.svelte';
import type { Component } from 'svelte';

/** The dashboard page of each installable module, by module id. A module without an
 *  entry here is still installable; it just has no page of its own in the sidebar. */
export const MODULE_VIEWS: Record<string, Component<{ guildId: string; isAdmin: boolean }>> = {
  quotes: QuotesPage,
  booster: BoosterPage,
  'anti-tamper': AntiTamperPage,
  autoremover: AutoremoverPage,
  'ocr-detection': OcrDetectionPage,
  'role-colors': RoleColorsPage,
  'file-submissions': FileSubmissionsPage,
};
