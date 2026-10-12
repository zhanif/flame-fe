<script lang="ts">
  let { fields = 2, button = false }: { fields?: number; button?: boolean } = $props();
</script>

<div class="space-y-4" aria-hidden="true">
  {#each Array(fields) as _}
    <div class="space-y-2">
      <div class="h-2.5 w-24 rounded bg-slate-700/40 animate-pulse"></div>
      <div class="h-10 rounded-xl bg-slate-800/40 animate-pulse"></div>
    </div>
  {/each}
  {#if button}
    <div class="flex justify-end"><div class="h-9 w-28 rounded-xl bg-slate-800/40 animate-pulse"></div></div>
  {/if}
</div>
