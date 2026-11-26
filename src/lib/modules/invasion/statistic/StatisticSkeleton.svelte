<script lang="ts">
  import Card from '$lib/components/Card.svelte';

  // The four overview cards while the counts are on the way.
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-hidden="true">
  {#each [0, 1, 2, 3] as n (n)}
    <Card class="relative overflow-hidden">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 space-y-2">
          <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="mt-1 h-7 w-14 rounded bg-zinc-800/40 animate-pulse"></div>
        </div>
        <div class="h-10 w-10 shrink-0 rounded-xl bg-zinc-800/40 animate-pulse"></div>
      </div>
    </Card>
  {/each}
</div>
