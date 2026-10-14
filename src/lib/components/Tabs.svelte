<script lang="ts">
  import { Tabs } from 'bits-ui';
  import type { Component } from 'svelte';

  // A row of tabs for a page with several views. It only picks the view (`value`);
  // the page shows the content for it. bits-ui gives it arrow-key navigation and ARIA.
  let {
    value = $bindable(''),
    tabs,
  }: { value?: string; tabs: { id: string; label: string; icon: Component<any>; count?: number | null }[] } = $props();
</script>

<Tabs.Root bind:value>
  <Tabs.List class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50" aria-label="Views">
    {#each tabs as tab (tab.id)}
      <Tabs.Trigger value={tab.id} class="tab h-8 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer outline-none transition-colors">
        <tab.icon class="w-4 h-4" />
        {tab.label}
        {#if tab.count != null}<span class="text-xs text-zinc-500">{tab.count}</span>{/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
</Tabs.Root>
