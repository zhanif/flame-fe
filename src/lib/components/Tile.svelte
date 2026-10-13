<script lang="ts">
  import { type Tone, tile } from '$lib/ui';
  import type { Component } from 'svelte';

  let { icon: Icon, tone = 'orange', size = 'md' }: { icon: Component<any>; tone?: Tone; size?: 'sm' | 'md' | 'lg' } = $props();

  const BOX = { sm: 'w-7 h-7 rounded-lg', md: 'w-9 h-9 rounded-xl', lg: 'w-12 h-12 rounded-2xl' } as const;
  const ICON = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-6 h-6' } as const;
</script>

<div class="shrink-0 flex items-center justify-center {BOX[size]} {tile[tone]}">
  <Icon class={ICON[size]} />
</div>
