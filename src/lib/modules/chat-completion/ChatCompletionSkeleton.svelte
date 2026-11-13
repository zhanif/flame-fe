<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';

  // The Statistic tab while its numbers are on the way: today's counters, the answers chart and the member
  // table. The same shape serves the layout before the page mounts, so the page never swaps one skeleton for
  // another on the way in.
</script>

<div class="space-y-5" aria-hidden="true">
  <Card>
    <div class="mb-5 h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each [0, 1, 2] as n (n)}
        <div class="rounded-xl bg-zinc-800/30 p-4 ring-1 ring-zinc-800/60">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="h-2.5 w-24 rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-4 w-4 shrink-0 rounded bg-zinc-700/30 animate-pulse"></div>
          </div>
          <div class="mb-2 h-7 w-16 rounded bg-zinc-700/30 animate-pulse"></div>
          <div class="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div class="h-full w-1/3 rounded-full bg-zinc-700/40 animate-pulse"></div>
          </div>
          <div class="mt-2 h-2.5 w-full rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
      {/each}
    </div>
  </Card>

  <Card>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="h-3 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
      <ControlSkeleton class="w-32" h="h-8" />
    </div>
    <div class="h-32 rounded-xl bg-zinc-800/30 animate-pulse"></div>
  </Card>

  <Card>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div class="h-3 w-28 rounded bg-zinc-800/40 animate-pulse"></div>
      <ControlSkeleton class="w-36" h="h-8" />
    </div>
    <TableSkeleton columns={['flex-1', '>w-36', '>w-36']} kinds={['actor', 'bar', 'bar']} rows={4} rowHeight="h-11" />
  </Card>
</div>
