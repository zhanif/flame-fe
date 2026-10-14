<script lang="ts">
  import type { Snippet } from 'svelte';

  // One numbered section of a legal page: a heading, then paragraphs and lists as plain markup.
  let { n, title, children }: { n: number; title: string; children: Snippet } = $props();
</script>

<section class="legal space-y-3 text-sm leading-relaxed text-zinc-300">
  <h2 class="font-display text-lg font-bold text-zinc-100 pb-2 border-b border-zinc-800/50"><span class="text-zinc-500">{n}.</span> {title}</h2>
  {@render children()}
</section>

<style>
  .legal :global(ul) {
    list-style: disc;
    padding-left: 1.25rem;
  }
  .legal :global(li + li) {
    margin-top: 0.375rem;
  }
  .legal :global(strong) {
    color: rgb(var(--zinc-100));
    font-weight: 600;
  }
</style>
