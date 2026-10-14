<script lang="ts">
  import { MODULE_PAGES, PAGES } from '$lib/nav';
  import type { GuildPage } from '$lib/stores/router.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Tile from './Tile.svelte';

  // The top bar while the page behind it loads. Which page it is comes from the address, so its icon, color and
  // title are already known and are drawn for real; only the description (the page's own text) is a placeholder.
  let { page, module }: { page?: GuildPage; module?: string } = $props();

  const meta = $derived(module ? MODULE_PAGES[module] : PAGES[page ?? 'dashboard']);
</script>

<div class="sticky top-0 z-30 flex items-center justify-between gap-3 -mx-5 -mt-5 mb-5 px-5 h-[69px] border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-md">
  <div class="flex items-center gap-3 min-w-0">
    {#if meta}
      <Tile icon={meta.icon} tone={meta.tone} />
    {:else}
      <div class="w-9 h-9 rounded-xl bg-zinc-700/40 animate-pulse" aria-hidden="true"></div>
    {/if}
    <div class="min-w-0 space-y-1.5">
      {#if meta}
        <h2 class="font-display text-base font-bold text-zinc-100 leading-5">{meta.label}</h2>
      {:else}
        <div class="h-3 w-28 rounded bg-zinc-700/40 animate-pulse" aria-hidden="true"></div>
      {/if}
      <div class="h-2.5 w-52 rounded bg-zinc-700/30 animate-pulse" aria-hidden="true"></div>
    </div>
  </div>
  <ThemeToggle />
</div>
