<script lang="ts">
  import { MODULE_PAGES, PAGES } from '$lib/nav';
  import type { GuildPage } from '$lib/stores/router.svelte';
  import { moduleCatalog } from '$lib/stores/modules.svelte';
  import { PowerOff } from '@lucide/svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Tile from './Tile.svelte';

  // A core page (`page`) or an installable module's page (`module`).
  let { page, module, description }: { page?: GuildPage; module?: string; description: string } = $props();

  const meta = $derived(module ? MODULE_PAGES[module] : PAGES[page ?? 'dashboard']);
  // A module an admin turned off keeps its page and settings, so the page says why nothing happens.
  const turnedOff = $derived(!!module && moduleCatalog.entries.some(m => m.id === module && m.installed && !m.enabled));
</script>

<!-- The top bar: page identity on the left (label, icon and color come from the
     same table as the sidebar), the theme toggle on the right. Page actions
     belong in the page content, not here. -->
<div class="sticky top-0 z-30 flex items-center justify-between gap-3 -mx-5 -mt-5 mb-5 px-5 h-[69px] border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-md">
  <div class="flex items-center gap-3 min-w-0">
    <Tile icon={meta.icon} tone={meta.tone} />
    <div class="min-w-0">
      <h2 class="font-display text-base font-bold text-zinc-100 leading-5">{meta.label}</h2>
      <p class="text-xs text-zinc-500 truncate">{description}</p>
    </div>
  </div>
  <ThemeToggle />
</div>
{#if turnedOff}
  <div class="mb-5 flex items-center gap-3 rounded-xl bg-sky-500/10 px-4 py-3" role="status">
    <PowerOff class="h-4 w-4 shrink-0 text-sky-400" />
    <p class="text-xs leading-relaxed text-sky-300">
      <span class="font-bold text-sky-300">Turned off.</span> Its data and settings are kept, but nothing of it runs until an admin turns it on from the Dashboard.
    </p>
  </div>
{/if}
