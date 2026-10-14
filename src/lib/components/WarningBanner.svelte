<script lang="ts">
  import { moduleCatalog } from '$lib/stores/modules.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { TriangleAlert } from '@lucide/svelte';

  // What stops a module from doing its job right now (a missing permission, say), kept on the
  // page until it is fixed. Nothing is shown when there is nothing to warn about, nor while the
  // module is turned off: it does nothing then, so there is nothing for these to stop (the page says it is off).
  let { warnings }: { warnings: string[] } = $props();

  const turnedOff = $derived(!!router.moduleId && moduleCatalog.entries.some(m => m.id === router.moduleId && m.installed && !m.enabled));
</script>

{#if warnings.length && !turnedOff}
  <div class="rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25 px-4 py-3 flex gap-3" role="alert">
    <TriangleAlert class="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
    <ul class="space-y-1 text-xs leading-relaxed text-amber-400">
      {#each warnings as warning (warning)}<li>{warning}</li>{/each}
    </ul>
  </div>
{/if}
