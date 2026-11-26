<script lang="ts">
  import { Tabs } from 'bits-ui';
  import type { Component } from 'svelte';

  type TabItem = { id: string; label: string; icon: Component<any>; count?: number | null };

  // A row of tabs for a page with several views. It only picks the view (`value`);
  // the page shows the content for it. bits-ui gives it arrow-key navigation and ARIA.
  // `right` adds a second group in the same row, pushed to the far end: overview tabs on
  // the left, the data views on the right, with the space between them.
  let { value = $bindable(''), tabs, right }: { value?: string; tabs: TabItem[]; right?: TabItem[] } = $props();
</script>

{#snippet triggers(items: TabItem[])}
  {#each items as tab (tab.id)}
    <Tabs.Trigger
      value={tab.id}
      class="tab h-8 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer outline-none transition-colors"
    >
      <tab.icon class="w-4 h-4" />
      {tab.label}
      {#if tab.count === null}
        <span class="h-3 w-4 rounded bg-zinc-700/50 animate-pulse" aria-hidden="true"></span>
      {:else if tab.count !== undefined}
        <span class="text-xs text-zinc-500">{tab.count}</span>
      {/if}
    </Tabs.Trigger>
  {/each}
{/snippet}

<Tabs.Root bind:value>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <Tabs.List class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50" aria-label="Views">
      {@render triggers(tabs)}
    </Tabs.List>
    {#if right?.length}
      <Tabs.List class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50" aria-label="Data views">
        {@render triggers(right)}
      </Tabs.List>
    {/if}
  </div>
</Tabs.Root>
