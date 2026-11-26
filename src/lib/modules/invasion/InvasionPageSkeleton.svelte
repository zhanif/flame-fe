<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ItemConfigLayoutSkeleton from '$lib/modules/invasion/items/ItemConfigLayoutSkeleton.svelte';
  import ItemsSkeleton from '$lib/modules/invasion/items/ItemsSkeleton.svelte';
  import SettingsSkeleton from '$lib/modules/invasion/settings/SettingsSkeleton.svelte';
  import StatisticSkeleton from '$lib/modules/invasion/statistic/StatisticSkeleton.svelte';
  import type { ItemConfigSection } from '$lib/modules/invasion/items/item-config';
  import { urlParam } from '$lib/utils/url-param';

  // The whole Invasion page body while the installed-module list is still loading: the two tab groups, then the
  // shape of the view the address asks for (its stats, its settings, the item catalog, or the item configuration).
  let { isAdmin }: { isAdmin: boolean } = $props();

  const tab = $derived(urlParam('tab', 'statistic').value);
  const config = $derived(urlParam('config').value);
  const section = $derived<ItemConfigSection>(config === 'rarity' || config === 'affinity' || config === 'effect' ? config : 'general');
</script>

<div class="flex flex-wrap items-center justify-between gap-3" aria-hidden="true">
  <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50">
    {#each [40, 40] as width, n (n)}
      <div class="h-8 w-{width} rounded-lg bg-zinc-700/30 animate-pulse"></div>
    {/each}
  </div>
  <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50">
    {#each [28, 28, 32, 40] as width, n (n)}
      <div class="h-8 w-{width} rounded-lg bg-zinc-700/30 animate-pulse"></div>
    {/each}
  </div>
</div>

<div class="mt-5 space-y-5" aria-hidden="true">
  {#if config}
    <ItemConfigLayoutSkeleton {section} {isAdmin} />
  {:else if tab === 'settings'}
    <SettingsSkeleton />
  {:else if tab === 'items'}
    <ItemsSkeleton {isAdmin} />
  {:else if tab === 'statistic'}
    <StatisticSkeleton />
  {:else}
    <Card>
      <div class="h-3 w-24 rounded bg-zinc-800/40 animate-pulse"></div>
    </Card>
  {/if}
</div>
