<script lang="ts">
  // One width class per column of the real table (`w-24`, `flex-1`, …); prefix
  // with `>` for a right-aligned column. Cells mirror the real table: same
  // widths, `px-5` per cell, header `h-10`, rows `h-11` (or `rowHeight`).
  let { columns, rows = 4, header = true, rowHeight = 'h-11' }: { columns: string[]; rows?: number; header?: boolean; rowHeight?: string } = $props();

  const parsed = $derived(columns.map(c => ({ width: c.replace('>', ''), right: c.startsWith('>') })));
  const BARS = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3'];
</script>

<div aria-hidden="true">
  {#if header}
    <div class="flex items-center h-10 border-b border-zinc-800/40">
      {#each parsed as col}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} px-5 flex {col.right ? 'justify-end' : ''}">
          <div class="h-2.5 w-12 max-w-full rounded bg-zinc-700/40 animate-pulse"></div>
        </div>
      {/each}
    </div>
  {/if}
  {#each Array(rows) as _, row}
    <div class="flex items-center {rowHeight} border-b border-zinc-800/20">
      {#each parsed as col, c}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} px-5 flex {col.right ? 'justify-end' : ''}">
          <div class="h-3 rounded bg-zinc-800/40 animate-pulse {col.right ? 'w-8' : BARS[(row + c) % BARS.length]}"></div>
        </div>
      {/each}
    </div>
  {/each}
</div>
