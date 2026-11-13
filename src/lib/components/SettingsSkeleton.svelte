<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';

  // Settings is three cards: the bot's look in this server, the general server settings, and the access roles.
  const label = 'h-2.5 w-20 rounded bg-zinc-700/40 animate-pulse';
  const hint = 'h-3 rounded bg-zinc-800/40 animate-pulse';
  const control = 'h-9 rounded-lg bg-zinc-800/40 animate-pulse';
</script>

<div class="space-y-5" aria-hidden="true">
  <Card>
    <div class="mb-5 h-3 w-40 rounded bg-zinc-700/40 animate-pulse"></div>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div class="space-y-5">
        <div class="space-y-2">
          <div class={label}></div>
          <div class="{hint} w-3/4"></div>
          <div class={control}></div>
        </div>
        {#each [0, 1] as n (n)}
          <div class="space-y-2">
            <div class={label}></div>
            <div class="{hint} w-2/3"></div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="animate-pulse bg-zinc-800/40 {n === 0 ? 'h-14 w-14 rounded-full' : 'h-12 w-[7.5rem] rounded-lg'}"></div>
              <div class="h-8 w-32 rounded-lg bg-zinc-800/40 animate-pulse"></div>
              <div class="h-8 w-40 rounded-lg bg-zinc-800/30 animate-pulse"></div>
            </div>
          </div>
        {/each}
      </div>
      <div class="min-w-0 space-y-2">
        <div class="{label} w-16"></div>
        <div class="h-[7.75rem] rounded-xl bg-zinc-800/40 animate-pulse"></div>
        <div class="h-16 rounded-xl bg-zinc-800/30 animate-pulse"></div>
      </div>
    </div>
  </Card>

  <Card>
    <div class="mb-5 h-3 w-20 rounded bg-zinc-700/40 animate-pulse"></div>
    <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {#each [0, 1, 2] as n (n)}
        <div class="space-y-2">
          <div class={label}></div>
          <div class="{hint} {n === 2 ? 'w-1/2' : 'w-3/4'}"></div>
          <div class={control}></div>
        </div>
      {/each}
    </div>
  </Card>

  <Card>
    <div class="mb-5 h-3 w-28 rounded bg-zinc-700/40 animate-pulse"></div>
    <div class="space-y-5">
      {#each [0, 1] as n (n)}
        <div class="space-y-2">
          <div class={label}></div>
          <div class="{hint} w-2/3"></div>
          <div class={control}></div>
        </div>
      {/each}
    </div>
  </Card>

  <div class="flex justify-end"><ControlSkeleton class="w-36" h="h-8" /></div>
</div>
