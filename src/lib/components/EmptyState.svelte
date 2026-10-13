<script lang="ts">
  import EmptyArt, { type ArtKind } from '$lib/components/EmptyArt.svelte';

  // A centered, panel-less message: an illustration, a gray title and a gray hint (always all three).
  // Always centered on both axes. `fill` spans the whole content height (a page that
  // cannot show anything at all); otherwise it spans what is left under the top bar.
  let {
    kind,
    title,
    description,
    fill = false,
  }: { kind: ArtKind; title: string; description: string; fill?: boolean } = $props();
</script>

<div class="flex flex-col items-center justify-center text-center px-5 {fill ? 'min-h-[calc(100vh-2.5rem)]' : 'min-h-[calc(100vh-13rem)]'}">
  <div class="mb-4"><EmptyArt {kind} /></div>
  <h2 class="text-sm font-semibold text-zinc-300">{title}</h2>
  <p class="text-xs text-zinc-500 mt-1.5 max-w-lg leading-relaxed">{description}</p>
</div>
