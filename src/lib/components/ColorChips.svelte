<script lang="ts">
  // The colors of a role as chips: a flat swatch and the hex code of each. No colors reads as "None".
  let { colors }: { colors: string[] } = $props();
</script>

<span class="inline-flex flex-wrap items-center gap-1.5">
  {#each colors as color (color)}
    <span class="inline-flex items-center gap-1.5 rounded-md bg-zinc-800/60 py-1 pl-1.5 pr-2 ring-1 ring-zinc-700/60">
      <span class="h-3.5 w-3.5 rounded ring-1 ring-black/20" style="background:{color}"></span>
      <span class="font-mono text-xs text-zinc-300">{color}</span>
    </span>
  {:else}
    <span class="inline-flex items-center rounded-md bg-zinc-800/40 px-2 py-1 text-xs text-zinc-500 ring-1 ring-zinc-700/40">None</span>
  {/each}
</span>
