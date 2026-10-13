<script lang="ts">
  import { control } from '$lib/ui';
  import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';
  import Button from './Button.svelte';

  let {
    page,
    limit,
    total,
    onPage,
    onLimit,
    disabled = false,
  }: {
    page: number;
    limit: number;
    total: number;
    onPage: (page: number) => void;
    onLimit: (limit: number) => void;
    disabled?: boolean;
  } = $props();

  const LIMITS = [10, 20, 50, 100];

  const totalPages = $derived(Math.max(Math.ceil(total / limit), 1));
  const from = $derived(total === 0 ? 0 : (page - 1) * limit + 1);
  const to = $derived(Math.min(page * limit, total));
</script>

<div class="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-zinc-800/40">
  <p class="text-xs text-zinc-500">{from}-{to} of {total}</p>

  <div class="flex flex-wrap items-center gap-3">
    <label class="flex items-center gap-2 text-xs text-zinc-500">
      Rows
      <select
        value={limit}
        onchange={e => onLimit(Number(e.currentTarget.value))}
        {disabled}
        class="{control} h-7 px-2 text-xs cursor-pointer"
      >
        {#each LIMITS as l}<option value={l}>{l}</option>{/each}
      </select>
    </label>

    <div class="flex items-center gap-1">
      <Button size="icon" onclick={() => onPage(1)} disabled={disabled || page <= 1} aria-label="First page" title="First"><ChevronsLeft class="w-3.5 h-3.5" /></Button>
      <Button size="icon" onclick={() => onPage(page - 1)} disabled={disabled || page <= 1} aria-label="Previous page" title="Previous"><ChevronLeft class="w-3.5 h-3.5" /></Button>
      <span class="px-2 text-xs text-zinc-500">{page} / {totalPages}</span>
      <Button size="icon" onclick={() => onPage(page + 1)} disabled={disabled || page >= totalPages} aria-label="Next page" title="Next"><ChevronRight class="w-3.5 h-3.5" /></Button>
      <Button size="icon" onclick={() => onPage(totalPages)} disabled={disabled || page >= totalPages} aria-label="Last page" title="Last"><ChevronsRight class="w-3.5 h-3.5" /></Button>
    </div>
  </div>
</div>
