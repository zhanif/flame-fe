<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Component } from 'svelte';

  interface Props {
    title: string;
    description: string;
    icon: Component<any>;
    actions?: Snippet;
  }

  let { title, description, icon: Icon, actions }: Props = $props();
</script>

<div class="flex items-center justify-between gap-3 mb-4">
  <div class="flex items-center gap-2.5">
    <div class="w-8 h-8 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20 flex items-center justify-center">
      <Icon class="w-4 h-4 text-orange-400" />
    </div>
    <div>
      <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider">{title}</h2>
      <p class="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
  </div>
  {#if actions}<div class="flex items-center gap-2">{@render actions()}</div>{/if}
</div>
