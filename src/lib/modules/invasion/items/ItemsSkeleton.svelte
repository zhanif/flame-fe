<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';

  // The item catalog while the list and its definitions load: the count and buttons over the filter column
  // and the item table.
  let { isAdmin }: { isAdmin: boolean } = $props();
</script>

<div class="space-y-5" aria-hidden="true">
  <div class="flex items-center justify-between gap-3">
    <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
    <div class="flex items-center gap-2">
      <ControlSkeleton class="w-28" h="h-8" />
      {#if isAdmin}<ControlSkeleton class="w-28" h="h-8" />{/if}
    </div>
  </div>

  <div class="grid items-start gap-3 lg:grid-cols-[17rem_1fr]">
    <Card>
      <div class="h-4 w-14 rounded bg-zinc-800/40 animate-pulse"></div>
      <div class="mt-4 space-y-3">
        <ControlSkeleton class="w-full" />
        <ControlSkeleton class="w-full" />
        <ControlSkeleton class="w-full" />
      </div>
    </Card>
    <Card flush>
      <TableSkeleton
        columns={['w-16', 'flex-1', 'w-28', 'w-28', 'w-20', 'w-32', 'w-20', 'w-24', 'w-32']}
        headings={['#', 'Name', 'Rarity', 'Type', 'Price', 'Element', 'Shop', 'Reward', '']}
        kinds={['bar', 'text', 'pill', 'bar', 'bar', 'bar', 'pill', 'pill', 'actions']}
        rows={4}
        rowHeight="h-14"
      />
    </Card>
  </div>
</div>
