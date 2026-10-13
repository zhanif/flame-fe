<script lang="ts">
  import { tile, toneFor } from '$lib/ui';

  // A server icon. Without an image it falls back to the first letter on a tile
  // whose color is picked from the server id, so every server keeps its own color.
  let {
    src,
    name,
    id,
    size = 'md',
    dim = false,
  }: { src: string | null; name: string; id: string; size?: 'sm' | 'md' | 'lg'; dim?: boolean } = $props();

  const BOX = { sm: 'w-8 h-8 rounded-full text-xs', md: 'w-11 h-11 rounded-xl text-base', lg: 'w-14 h-14 rounded-2xl text-xl' } as const;
</script>

{#if src}
  <img {src} alt="" class="shrink-0 ring-1 ring-zinc-700/60 {BOX[size]} {dim ? 'grayscale' : ''}" />
{:else}
  <div class="shrink-0 flex items-center justify-center font-display font-extrabold {BOX[size]} {tile[toneFor(id)]}">
    {name.charAt(0).toUpperCase()}
  </div>
{/if}
