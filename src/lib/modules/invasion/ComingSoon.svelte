<script lang="ts">
  import Card from '$lib/components/Card.svelte';

  // The one line a not-yet-built invasion tab shows, so every section lives somewhere from the start.
  let { title }: { title: string } = $props();
</script>

<Card>
  <p class="text-sm text-zinc-400">{title} is coming soon.</p>
</Card>
