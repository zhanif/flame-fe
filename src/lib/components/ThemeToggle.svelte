<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte';
  import { Moon, Sun } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';
  import Button from './Button.svelte';

  const dark = $derived(theme.current === 'dark');
</script>

<Button variant="ghost" size="icon" onclick={() => theme.toggle()} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'} class="relative overflow-hidden">
  {#key dark}
    <span class="absolute inset-0 flex items-center justify-center" in:fly={{ y: -12, duration: 220 }} out:fade={{ duration: 80 }}>
      {#if dark}<Sun class="w-4 h-4" />{:else}<Moon class="w-4 h-4" />{/if}
    </span>
  {/key}
</Button>
