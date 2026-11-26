<script lang="ts">
  import { Mouse } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  // A scrollable box that hides its scrollbar and, while there is more to see below,
  // shows a small "Scroll" label pinned to its bottom edge. It watches its own size and
  // content, so the label appears and disappears on its own. `hideHint` mutes it (used
  // while a form is open inside, where the label would just be in the way).
  let { class: className = '', hideHint = false, children }: { class?: string; hideHint?: boolean; children: Snippet } = $props();

  let el = $state<HTMLElement | null>(null);
  let more = $state(false);

  function update() {
    if (!el) return;
    more = el.scrollHeight - el.scrollTop - el.clientHeight > 1;
  }

  $effect(() => {
    const node = el;
    if (!node) return;
    update();
    const onScroll = () => update();
    node.addEventListener('scroll', onScroll, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(node);
    const mutation = new MutationObserver(update);
    mutation.observe(node, { childList: true, subtree: true, characterData: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      resize.disconnect();
      mutation.disconnect();
    };
  });
</script>

<div class="relative">
  <div bind:this={el} class="no-scrollbar overflow-y-auto {className}">
    {@render children()}
  </div>
  {#if more && !hideHint}
    <div class="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
      <span
        class="inline-flex items-center gap-1 rounded-full bg-zinc-900/90 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800"
      >
        <Mouse class="h-3 w-3" />Scroll
      </span>
    </div>
  {/if}
</div>
