<script lang="ts">
  import type { Component } from 'svelte';

  // A small switch between two or three closely related views inside a tab (Roles / Channels). Lighter than
  // Tabs, which are for the sections of a page: this one sits above the content it switches.
  let {
    value = $bindable(''),
    options,
    label = 'View',
  }: { value?: string; options: { id: string; label: string; icon?: Component<any>; count?: number | null }[]; label?: string } = $props();
</script>

<div class="inline-flex items-center gap-0.5 rounded-lg bg-zinc-800/60 p-0.5" role="radiogroup" aria-label={label}>
  {#each options as option (option.id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.id}
      onclick={() => (value = option.id)}
      class="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/50 {value === option.id
        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200'}"
    >
      {#if option.icon}<option.icon class="h-3.5 w-3.5" />{/if}
      {option.label}
      {#if option.count === null}
        <span class="h-2.5 w-3 rounded bg-zinc-600/50 animate-pulse" aria-hidden="true"></span>
      {:else if option.count !== undefined}
        <span class="text-zinc-500">{option.count}</span>
      {/if}
    </button>
  {/each}
</div>
