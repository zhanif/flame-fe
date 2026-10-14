<script lang="ts">
  // The stand-in for a form while it loads. `grid` lays the fields out in two columns like the real form,
  // `hint` adds the helper line most fields have between the label and the control.
  let { fields = 2, button = false, grid = false, hint = false }: { fields?: number; button?: boolean; grid?: boolean; hint?: boolean } = $props();
</script>

<div class={grid ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5' : 'space-y-4'} aria-hidden="true">
  {#each Array(fields) as _}
    <div class="space-y-2">
      <div class="h-2.5 w-24 rounded bg-zinc-700/40 animate-pulse"></div>
      {#if hint}<div class="h-3 w-3/4 rounded bg-zinc-800/40 animate-pulse"></div>{/if}
      <div class="h-9 rounded-lg bg-zinc-800/40 animate-pulse"></div>
    </div>
  {/each}
  {#if button}
    <div class="flex justify-end {grid ? 'sm:col-span-2' : ''}"><div class="h-8 w-24 rounded-lg bg-zinc-800/40 animate-pulse"></div></div>
  {/if}
</div>
