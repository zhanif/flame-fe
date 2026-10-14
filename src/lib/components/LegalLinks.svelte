<script lang="ts">
  import { router } from '$lib/stores/router.svelte';

  // The two legal pages, reachable from every public or top level page.
</script>

<nav class="flex items-center gap-5" aria-label="Legal">
  <button type="button" onclick={() => router.legalPage('privacy')} class="hover:text-zinc-200 cursor-pointer transition-colors">Privacy Policy</button>
  <button type="button" onclick={() => router.legalPage('terms')} class="hover:text-zinc-200 cursor-pointer transition-colors">Terms of Service</button>
</nav>
