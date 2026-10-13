<script lang="ts">
  import { pageTone } from '$lib/nav';
  import { type Tone, toneText } from '$lib/ui';
  import type { Component } from 'svelte';

  // A section heading: a small colored icon beside the title, nothing else (no
  // subtitle). Only the top bar uses boxed icons.
  let {
    icon: Icon,
    tone,
    title,
    class: className = '',
  }: { icon: Component<any>; tone?: Tone; title: string; class?: string } = $props();

  const pageColor = pageTone();
</script>

<div class={className}>
  <h3 class="flex items-center gap-2 font-display text-sm font-bold text-zinc-100">
    <Icon class="w-4 h-4 shrink-0 {toneText[tone ?? pageColor()]}" />{title}
  </h3>
</div>
