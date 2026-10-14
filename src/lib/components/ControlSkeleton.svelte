<script lang="ts">
  // The stand-in for a control whose content depends on loaded data (a filter with its options, a button
  // that needs the list). Same size as the control, so nothing shifts when it arrives. Controls that do not
  // depend on data (tabs, a Refresh button) are simply drawn, not skeletons.
  let { class: className = 'w-44', h = 'h-9' }: { class?: string; h?: 'h-8' | 'h-9' } = $props();
</script>

<div class="{h} rounded-lg bg-zinc-800/40 animate-pulse {className}" aria-hidden="true"></div>
