<script lang="ts">
  import Card from './Card.svelte';
  import ControlSkeleton from './ControlSkeleton.svelte';
  import TableSkeleton from './TableSkeleton.svelte';

  // The body of a module page while the page itself cannot be shown yet (the list of installed modules is
  // still loading). The address says which module it is, so the skeleton has that module's shape: a
  // breadcrumb and long panels for File Submissions, tabs over a table for the others.
  let { module, guildId }: { module: string; guildId: string } = $props();

  const PANELS = ['file-submissions'];
  const TABS: Record<string, number[]> = {
    quotes: [28, 28],
    booster: [28, 36, 36],
    'anti-tamper': [28, 36, 36],
    autoremover: [28, 28],
    'ocr-detection': [36, 32],
    'role-colors': [],
  };

  // The number of panels the last visit had, so a reload shows as many.
  const panelCount = $derived.by(() => {
    try {
      return Math.min(3, Math.max(1, Number(sessionStorage.getItem(`flame:fs:${guildId}:collections`)) || 2));
    } catch {
      return 2;
    }
  });
</script>

<div class="space-y-5" aria-hidden="true">
  {#if PANELS.includes(module)}
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="h-5 w-24 rounded bg-zinc-700/40 animate-pulse"></div>
      <div class="flex items-center gap-3">
        <ControlSkeleton class="w-36" h="h-8" />
        <ControlSkeleton class="w-36" h="h-8" />
      </div>
    </div>
    <div class="space-y-3">
      {#each Array(panelCount) as _, n (n)}
        <Card>
          <div class="flex items-center gap-4">
            <div class="grid min-w-0 flex-1 items-center gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
              <div class="space-y-2">
                <div class="h-3.5 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
                <div class="h-3 w-24 rounded bg-zinc-800/30 animate-pulse"></div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                {#each [0, 1, 2] as c (c)}
                  <div class="space-y-1.5">
                    <div class="h-2.5 w-12 rounded bg-zinc-700/40 animate-pulse"></div>
                    <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
                  </div>
                {/each}
              </div>
              <div class="grid grid-cols-2 gap-4">
                {#each [0, 1] as c (c)}
                  <div class="space-y-1.5">
                    <div class="h-2.5 w-14 rounded bg-zinc-700/40 animate-pulse"></div>
                    <div class="h-5 w-20 rounded-md bg-zinc-800/40 animate-pulse"></div>
                  </div>
                {/each}
              </div>
            </div>
            <div class="h-7 w-16 shrink-0 rounded-lg bg-zinc-800/30 animate-pulse"></div>
          </div>
        </Card>
      {/each}
    </div>
  {:else}
    <div class="flex items-center justify-between gap-3 flex-wrap">
      {#if (TABS[module] ?? [28, 28]).length}
        <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50">
          {#each TABS[module] ?? [28, 28] as width, n (n)}
            <div class="h-8 w-{width} rounded-lg bg-zinc-700/30 animate-pulse"></div>
          {/each}
        </div>
      {:else}
        <span></span>
      {/if}
      <ControlSkeleton class="w-32" h="h-8" />
    </div>
    <Card flush><TableSkeleton columns={['w-16', 'flex-1', 'w-44', 'w-36']} rows={4} rowHeight="h-14" /></Card>
  {/if}
</div>
