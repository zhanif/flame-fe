<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { bot } from '$lib/stores/bot.svelte';
</script>

<div class="relative min-h-screen flex items-center justify-center p-5">
  <div class="absolute top-5 right-5 z-10"><ThemeToggle /></div>

  <div class="relative max-w-sm w-full text-center">
    {#if bot.avatar}
      <img src={bot.avatar} alt={bot.name} class="w-24 h-24 rounded-full mx-auto mb-6 ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/20" />
    {/if}
    <h1 class="font-display text-5xl font-extrabold tracking-tight mb-3 text-orange-400">{bot.name}</h1>
    <p class="text-sm text-zinc-400 mb-6 leading-relaxed">Manage your server and the modules installed in it.</p>
    <Button variant="primary" href="/api/auth/login" class="w-full !h-10 !text-sm">Log in with Discord</Button>
    <div class="flex flex-wrap items-center justify-center gap-2 mt-6">
      <Badge tone="brand">Modular</Badge>
      <Badge tone="info">Per server</Badge>
      <Badge tone="accent">Slash commands</Badge>
    </div>
  </div>
</div>
