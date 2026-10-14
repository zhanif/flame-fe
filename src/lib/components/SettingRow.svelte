<script lang="ts">
  import type { Snippet } from 'svelte';

  // One setting of a settings card: what it is and what it does on the left, the control on the
  // right. On a narrow screen the control drops under the text. Rows are separated by a thin line.
  let { title, hint, error = false, children }: { title: string; hint?: string; error?: boolean; children: Snippet } = $props();
</script>

<div class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 border-b border-zinc-800/40 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
  <div class="min-w-0 sm:max-w-md">
    <p class="text-sm font-semibold text-zinc-100">{title}</p>
    {#if hint}<p class="mt-1 text-xs leading-relaxed {error ? 'text-red-400' : 'text-zinc-500'}">{hint}</p>{/if}
  </div>
  <div class="w-full sm:w-80 shrink-0">{@render children()}</div>
</div>
