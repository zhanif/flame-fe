<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';

  // The Server configuration and Gameplay settings cards with their Save row, while settings load.
</script>

<div class="space-y-5" aria-hidden="true">
  <Card>
    <div class="mb-4 h-3 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
    {#each [0, 1, 2, 3, 4] as n (n)}
      <div
        class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-zinc-800/40 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
      >
        <div class="min-w-0 space-y-2 sm:max-w-md">
          <div class="h-3.5 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-3 w-full max-w-xs rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
        <ControlSkeleton class="w-full sm:w-72" h="h-9" />
      </div>
    {/each}
  </Card>

  <Card>
    <div class="mb-4 h-3 w-24 rounded bg-zinc-800/40 animate-pulse"></div>
    <div class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div class="min-w-0 space-y-2 sm:max-w-md">
        <div class="h-3.5 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
        <div class="h-3 w-full max-w-xs rounded bg-zinc-800/30 animate-pulse"></div>
      </div>
      <div class="h-5 w-9 shrink-0 rounded-full bg-zinc-800/40 animate-pulse"></div>
    </div>
  </Card>

  <div class="flex justify-end">
    <ControlSkeleton class="w-32" h="h-8" />
  </div>
</div>
