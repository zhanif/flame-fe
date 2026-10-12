<script lang="ts">
  import type { Snippet } from 'svelte';

  let { show, onClose, children }: { show: boolean; onClose: () => void; children: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => show && e.key === 'Escape' && onClose()} />

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="presentation" onclick={onClose}>
    <div
      class="w-full max-w-md mx-4 p-6 rounded-2xl bg-slate-900 ring-1 ring-slate-700/60 shadow-2xl"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      {@render children()}
    </div>
  </div>
{/if}
