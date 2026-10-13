<script lang="ts">
  import { PAGES } from '$lib/nav';
  import type { GuildPage } from '$lib/stores/router.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Tile from './Tile.svelte';

  let { page, description }: { page: GuildPage; description: string } = $props();

  const meta = $derived(PAGES[page]);
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
