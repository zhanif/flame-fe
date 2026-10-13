<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  let { show, onClose, children }: { show: boolean; onClose: () => void; children: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => show && e.key === 'Escape' && onClose()} />

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    role="presentation"
    onclick={onClose}
    transition:fade={{ duration: 150 }}
  >
    <div
      class="w-full max-w-md mx-5 p-5 rounded-2xl bg-zinc-900 ring-1 ring-zinc-700/60 shadow-xl shadow-black/30"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      transition:scale|global={{ start: 0.96, duration: 180 }}
    >
      {@render children()}
    </div>
  </div>
{/if}
