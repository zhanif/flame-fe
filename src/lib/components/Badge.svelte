<script lang="ts">
  import type { Snippet } from 'svelte';

  type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand' | 'info' | 'accent';

  let { tone = 'neutral', children }: { tone?: BadgeTone; children: Snippet } = $props();

  const TONES: Record<BadgeTone, string> = {
    success: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
    danger: 'text-red-400 bg-red-500/10 ring-red-500/20',
    brand: 'text-orange-400 bg-orange-500/10 ring-orange-500/20',
    info: 'text-sky-400 bg-sky-500/10 ring-sky-500/20',
    accent: 'text-violet-400 bg-violet-500/10 ring-violet-500/20',
    neutral: 'text-zinc-400 bg-zinc-700/30 ring-zinc-600/20',
  };
</script>

<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ring-1 {TONES[tone] ?? TONES.neutral}">
  {@render children()}
</span>
