<script lang="ts">
  // One width class per column of the real table (`w-24`, `flex-1`, …); prefix
  // with `>` for a right-aligned column.
  let { columns, rows = 4, header = true }: { columns: string[]; rows?: number; header?: boolean } = $props();

  const parsed = $derived(columns.map(c => ({ width: c.replace('>', ''), right: c.startsWith('>') })));
  const BARS = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3'];
</script>

<div aria-hidden="true">
  {#if header}
    <div class="flex items-center gap-3 px-3 py-3 border-b border-slate-800/40">
      {#each parsed as col}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} flex {col.right ? 'justify-end' : ''}">
          <div class="h-2.5 w-12 max-w-full rounded bg-slate-700/40 animate-pulse"></div>
        </div>
      {/each}
    </div>
  {/if}
  {#each Array(rows) as _, row}
    <div class="flex items-center gap-3 px-3 py-4 border-b border-slate-800/20">
      {#each parsed as col, c}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} flex {col.right ? 'justify-end' : ''}">
          <div class="h-3 rounded bg-slate-800/40 animate-pulse {col.right ? 'w-8' : BARS[(row + c) % BARS.length]}"></div>
        </div>
      {/each}
    </div>
  {/each}
</div>
