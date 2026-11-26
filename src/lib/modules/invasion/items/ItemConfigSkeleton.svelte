<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { itemConfigSection, type ItemConfigSection } from '$lib/modules/invasion/items/item-config';
  import { caps } from '$lib/ui';

  // The content panel of one item-configuration section while its definitions are on the way: the heading
  // (title and one line, straight from the section list) over the shape of whatever it will hold.
  let { section, isAdmin }: { section: ItemConfigSection; isAdmin: boolean } = $props();

  const info = $derived(itemConfigSection(section));
</script>

<Card>
  <SectionTitle icon={info.icon} title={info.label} />
  <p class="mt-1 text-xs text-zinc-500">{info.description}</p>

  {#if section === 'general'}
    <div class="mt-4">
      <div class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div class="min-w-0 space-y-2 sm:max-w-md">
          <div class="h-4 w-48 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-3 w-64 rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
        <div class="h-9 w-32 shrink-0 rounded-lg bg-zinc-800/40 animate-pulse"></div>
      </div>
      <div class="mt-5 flex justify-end"><div class="h-8 w-32 rounded-lg bg-zinc-800/40 animate-pulse"></div></div>
    </div>
  {:else if section === 'effect'}
    <div class="mt-4 overflow-hidden">
      <div class="overflow-hidden rounded-xl ring-1 ring-zinc-800/60">
        <div class="grid gap-x-4 bg-zinc-800/30 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
          <span class="{caps} text-zinc-400">Effect</span>
          <span class="{caps} text-zinc-400">Type</span>
          <span class="{caps} text-zinc-400">Domain</span>
        </div>
        <div class="divide-y divide-zinc-800/40">
          {#each Array(6) as _}
            <div class="grid items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
              <div class="min-w-0 space-y-1.5">
                <div class="h-4 w-36 rounded bg-zinc-800/40 animate-pulse"></div>
                <div class="h-3 w-56 rounded bg-zinc-800/30 animate-pulse"></div>
              </div>
              <div class="h-5 w-16 rounded-md bg-zinc-800/40 animate-pulse"></div>
              <div class="h-5 w-16 rounded-md bg-zinc-800/40 animate-pulse"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="mt-4 space-y-2">
      {#each Array(6) as _}
        <div class="flex items-start justify-between gap-2 rounded-xl bg-zinc-800/20 px-3 py-2.5 ring-1 ring-zinc-800/60">
          <div class="min-w-0 space-y-1.5">
            <div class="h-4 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="h-3 w-24 rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          {#if isAdmin}
            <div class="flex shrink-0 gap-1">
              {#each [0, 1] as n (n)}<div class="h-7 w-7 rounded-lg bg-zinc-800/40 animate-pulse"></div>{/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Card>
