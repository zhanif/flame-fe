<script lang="ts">
  import { toasts } from '$lib/stores/toast.svelte';
</script>

<div class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
  {#each toasts.list as t (t.id)}
    <div
      class="px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl ring-1 {t.kind === 'success'
        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
        : 'bg-red-500/15 text-red-300 ring-red-500/30'}"
    >
      {t.message}
    </div>
  {/each}
</div>
