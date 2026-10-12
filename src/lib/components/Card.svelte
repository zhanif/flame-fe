<script lang="ts">
  import type { Snippet } from 'svelte';

  let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<div class="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 {className}">
  {@render children()}
</div>
