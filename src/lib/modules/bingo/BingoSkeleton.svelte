<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';

  // A bingo page while its data is on the way, shaped like what is about to replace it: the rounds table, the
  // designs table, the two settings cards, or a round's header, switch, answers and board.
  let { view }: { view: 'threads' | 'designs' | 'settings' | 'round' | 'design' } = $props();
</script>

<div class="space-y-5" aria-hidden="true">
  {#if view === 'threads'}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <ControlSkeleton class="w-44" h="h-9" />
      <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
    </div>
    <Card flush>
      <TableSkeleton columns={['w-16', 'flex-1', 'flex-1', 'w-28', 'w-24', '>w-20', '>w-24', '>w-12']} rows={6} />
    </Card>
  {:else if view === 'designs'}
    <Card flush>
      <TableSkeleton columns={['w-16', 'flex-1', 'w-40', 'w-44', 'w-16']} rows={5} />
    </Card>
  {:else if view === 'settings'}
    <Card>
      <div class="mb-4 h-3 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
      {#each [0, 1, 2, 3, 4, 5] as n (n)}
        <div
          class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-zinc-800/40 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
        >
          <div class="min-w-0 space-y-2 sm:max-w-md">
            <div class="h-3.5 w-36 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="h-3 w-full max-w-xs rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          <ControlSkeleton class="w-full sm:w-80" h="h-9" />
        </div>
      {/each}
    </Card>
    <Card>
      <div class="mb-4 h-3 w-24 rounded bg-zinc-800/40 animate-pulse"></div>
      {#each [0, 1, 2, 3] as n (n)}
        <div
          class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-zinc-800/40 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
        >
          <div class="min-w-0 space-y-2 sm:max-w-md">
            <div class="h-3.5 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="h-3 w-full max-w-xs rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          <ControlSkeleton class="w-full sm:w-80" h="h-9" />
        </div>
      {/each}
    </Card>
    <div class="flex justify-end gap-2">
      <ControlSkeleton class="w-32" h="h-9" />
      <ControlSkeleton class="w-24" h="h-9" />
    </div>
  {:else if view === 'design'}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="h-9 w-9 shrink-0 rounded-lg bg-zinc-800/40 animate-pulse"></div>
        <div class="min-w-0 space-y-2">
          <div class="h-5 w-40 max-w-full rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-3 w-52 max-w-full rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <ControlSkeleton class="w-32" h="h-9" />
        <ControlSkeleton class="w-24" h="h-9" />
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <div class="space-y-5">
        <Card>
          <div class="mb-4 h-3 w-28 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="grid gap-4 sm:grid-cols-2">
            {#each [0, 1, 2, 3] as n (n)}
              <div class="space-y-1.5">
                <div class="h-2.5 w-16 rounded bg-zinc-800/30 animate-pulse"></div>
                <ControlSkeleton class="w-full" h="h-9" />
              </div>
            {/each}
          </div>
          <div class="mt-3 h-2.5 w-2/3 rounded bg-zinc-800/30 animate-pulse"></div>
        </Card>

        <Card>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div class="h-3 w-24 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="flex gap-1.5">
              {#each [0, 1] as n (n)}
                <ControlSkeleton class="w-20" h="h-8" />
              {/each}
            </div>
          </div>
          <div class="mb-1.5 flex items-center gap-2 px-0.5">
            <span class="w-7 shrink-0"></span>
            <div class="h-2.5 flex-1 rounded bg-zinc-800/30 animate-pulse"></div>
            <div class="h-2.5 w-24 shrink-0 rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          <div class="divide-y divide-zinc-800/40">
            {#each Array(12) as _, n (n)}
              <div class="flex items-center gap-2 py-1.5">
                <div class="h-6 w-7 shrink-0 rounded-md bg-zinc-800/70 animate-pulse"></div>
                <div class="min-w-0 flex-1"><ControlSkeleton class="w-full" h="h-9" /></div>
                <div class="w-24 shrink-0"><ControlSkeleton class="w-full" h="h-9" /></div>
              </div>
            {/each}
          </div>
        </Card>

        <Card>
          <div class="mb-4 h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {#each Array(6) as _, n (n)}
              <div class="space-y-1.5">
                <div class="h-2.5 w-16 rounded bg-zinc-800/30 animate-pulse"></div>
                <ControlSkeleton class="w-full" h="h-9" />
              </div>
            {/each}
          </div>
          <div class="mt-5 border-t border-zinc-800/60 pt-4">
            <div class="h-2.5 w-12 rounded bg-zinc-800/30 animate-pulse"></div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              {#each [0, 1, 2] as n (n)}
                <div class="rounded-lg border border-zinc-800/60 p-3">
                  <div class="mb-2 h-2.5 w-14 rounded bg-zinc-800/30 animate-pulse"></div>
                  <div class="grid grid-cols-2 gap-3">
                    {#each [0, 1] as c (c)}
                      <div class="space-y-1.5">
                        <div class="h-2.5 w-10 rounded bg-zinc-800/30 animate-pulse"></div>
                        <ControlSkeleton class="w-full" h="h-9" />
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
            <div class="flex flex-wrap gap-6">
              {#each [0, 1] as n (n)}
                <div class="flex items-center gap-2">
                  <div class="h-5 w-9 rounded-full bg-zinc-800/40 animate-pulse"></div>
                  <div class="h-2.5 w-14 rounded bg-zinc-800/30 animate-pulse"></div>
                </div>
              {/each}
            </div>
            <ControlSkeleton class="w-24" h="h-8" />
          </div>
        </Card>
      </div>

      <div class="space-y-3 xl:sticky xl:top-5 xl:self-start">
        <div class="flex items-center justify-between">
          <div class="h-2.5 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
        </div>
        <Card>
          <div class="mb-3 space-y-2">
            <div class="h-5 w-40 max-w-full rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-3 w-28 max-w-full rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          <div class="grid grid-cols-4 gap-2">
            {#each Array(12) as _, n (n)}
              <div class="aspect-square rounded-lg bg-zinc-800/40 animate-pulse"></div>
            {/each}
          </div>
          <div class="mt-3 flex justify-end">
            <div class="h-2.5 w-24 rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
        </Card>
        <div class="h-2.5 w-3/4 rounded bg-zinc-800/30 animate-pulse"></div>
        <div class="mt-2">
          <ControlSkeleton class="w-full" h="h-9" />
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-2">
        <div class="h-9 w-9 shrink-0 rounded-lg bg-zinc-800/40 animate-pulse"></div>
        <div class="space-y-2 pt-0.5">
          <div class="h-4 w-24 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-3 w-52 max-w-full rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-5 w-16 rounded-md bg-zinc-800/40 animate-pulse"></div>
        <div class="h-9 w-9 rounded-lg bg-zinc-800/30 animate-pulse"></div>
        <div class="h-9 w-9 rounded-lg bg-zinc-800/30 animate-pulse"></div>
      </div>
    </div>

    {#if view === 'round'}
      <div class="h-8 w-48 rounded-lg bg-zinc-800/40 animate-pulse"></div>
    {/if}

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <div class="space-y-5">
        <Card>
          <div class="mb-4 h-3 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="grid grid-cols-4 gap-2">
            {#each Array(12) as _, n (n)}
              <div class="h-11 rounded-lg bg-zinc-800/40 animate-pulse"></div>
            {/each}
          </div>
          <div class="mt-3 h-2.5 w-64 max-w-full rounded bg-zinc-800/30 animate-pulse"></div>
          <div class="mt-4 flex justify-end border-t border-zinc-800/60 pt-4">
            <ControlSkeleton class="w-32" h="h-9" />
          </div>
        </Card>

        {#if view === 'round'}
          <Card>
            <div class="mb-4 h-3 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
            <div class="mt-2 h-2.5 w-3/4 rounded bg-zinc-800/30 animate-pulse"></div>
            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-800">
              {#each [0, 1, 2, 3] as n (n)}
                <div class="flex items-center justify-between {n < 3 ? 'border-b border-zinc-800' : ''} px-3 py-2">
                  <div class="h-3 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
                  <div class="h-3 w-12 rounded bg-zinc-800/40 animate-pulse"></div>
                </div>
              {/each}
            </div>
            <div class="mt-3 flex justify-end">
              <ControlSkeleton class="w-32" h="h-9" />
            </div>
          </Card>
        {/if}
      </div>

      <div class="space-y-3 xl:sticky xl:top-5 xl:self-start">
        <div class="flex items-center justify-between gap-3">
          <div class="h-2.5 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
          <div class="h-2.5 w-28 rounded bg-zinc-800/30 animate-pulse"></div>
        </div>
        <Card>
          <div class="mb-3 space-y-2">
            <div class="h-5 w-40 max-w-full rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-3 w-28 max-w-full rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
          <div class="grid grid-cols-4 gap-2">
            {#each Array(12) as _, n (n)}
              <div class="aspect-square rounded-lg bg-zinc-800/40 animate-pulse"></div>
            {/each}
          </div>
          <div class="mt-3 flex justify-end">
            <div class="h-2.5 w-24 rounded bg-zinc-800/30 animate-pulse"></div>
          </div>
        </Card>
        <div class="h-2.5 w-3/4 rounded bg-zinc-800/30 animate-pulse"></div>
        <div class="flex flex-col gap-2">
          {#each [0, 1, 2] as n (n)}
            <ControlSkeleton class="w-full" h="h-9" />
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
