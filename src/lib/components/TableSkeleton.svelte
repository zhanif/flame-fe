<script lang="ts">
  import { caps } from '$lib/ui';

  type Kind = 'bar' | 'thumb' | 'actor' | 'pill' | 'actions' | 'action' | 'toggle';

  // One width class per column of the real table (`w-24`, `flex-1`, …); prefix
  // with `>` for a right-aligned column. Cells mirror the real table: same
  // widths, `px-5` per cell, header `h-10`, rows `h-11` (or `rowHeight`).
  // When the page already knows more, say so and the skeleton follows:
  // `headings` are the real column titles (shown as text, not bars), and `kinds`
  // shapes a column like what it will hold (a preview square, a member with an
  // avatar, a status pill, the row's action buttons).
  let {
    columns,
    rows = 4,
    header = true,
    rowHeight = 'h-11',
    headings,
    kinds,
  }: { columns: string[]; rows?: number; header?: boolean; rowHeight?: string; headings?: string[]; kinds?: Kind[] } = $props();

  const parsed = $derived(columns.map(c => ({ width: c.replace('>', ''), right: c.startsWith('>') })));
  const BARS = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3'];
</script>

<div aria-hidden="true">
  {#if header}
    <div class="flex items-center h-10 border-b border-zinc-800/40 {headings ? 'bg-zinc-800/20' : ''}">
      {#each parsed as col, c}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} px-5 flex {col.right ? 'justify-end' : ''}">
          {#if headings?.[c] !== undefined}
            <span class="{caps} text-zinc-500">{headings[c]}</span>
          {:else}
            <div class="h-2.5 w-12 max-w-full rounded bg-zinc-700/40 animate-pulse"></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  {#each Array(rows) as _, row}
    <div class="flex items-center {rowHeight} border-b border-zinc-800/20">
      {#each parsed as col, c}
        {@const kind = kinds?.[c] ?? 'bar'}
        <div class="{col.width} {col.width === 'flex-1' ? 'min-w-0' : 'shrink-0'} px-5 flex items-center {col.right || kind === 'actions' || kind === 'action' ? 'justify-end' : ''}">
          {#if kind === 'thumb'}
            <div class="h-14 w-14 rounded-lg bg-zinc-800/40 animate-pulse"></div>
          {:else if kind === 'actor'}
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 shrink-0 rounded-full bg-zinc-800/40 animate-pulse"></div>
              <div class="space-y-1.5">
                <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
                <div class="h-2.5 w-28 rounded bg-zinc-800/30 animate-pulse"></div>
              </div>
            </div>
          {:else if kind === 'pill'}
            <div class="h-5 w-16 rounded-md bg-zinc-800/40 animate-pulse"></div>
          {:else if kind === 'toggle'}
            <div class="h-5 w-9 rounded-full bg-zinc-800/40 animate-pulse"></div>
          {:else if kind === 'action'}
            <div class="h-7 w-7 rounded-lg bg-zinc-800/40 animate-pulse"></div>
          {:else if kind === 'actions'}
            <div class="flex gap-1">
              {#each [0, 1, 2] as n (n)}<div class="h-7 w-7 rounded-lg bg-zinc-800/40 animate-pulse"></div>{/each}
            </div>
          {:else}
            <div class="h-3 rounded bg-zinc-800/40 animate-pulse {col.right ? 'w-8' : BARS[(row + c) % BARS.length]}"></div>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</div>
