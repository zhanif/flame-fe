<script lang="ts">
  import type { Snippet } from 'svelte';

  // Every panel pads `p-5`. `flush` drops it so a table can run edge to edge
  // (its cells carry the same `px-5`). `interactive` adds the hover lift for
  // cards that act like buttons or tiles in a grid.
  let {
    class: className = '',
    flush = false,
    interactive = false,
    children,
  }: { class?: string; flush?: boolean; interactive?: boolean; children: Snippet } = $props();
</script>

<div
  class="rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-sm shadow-black/10 {flush ? 'overflow-hidden' : 'p-5'} {interactive
    ? 'transition duration-200 hover:-translate-y-0.5 hover:border-orange-500/30 hover:shadow-md hover:shadow-black/20'
    : ''} {className}"
>
  {@render children()}
</div>
