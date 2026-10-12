<script lang="ts">
  import { bot } from '$lib/stores/bot.svelte';
</script>

<div class="min-h-screen flex items-center justify-center p-6 bg-slate-950">
  <div class="max-w-sm w-full text-center">
    {#if bot.avatar}
      <img src={bot.avatar} alt={bot.name} class="w-20 h-20 rounded-full mx-auto mb-6 ring-2 ring-orange-500/30" />
    {/if}
    <h1 class="text-4xl font-extrabold tracking-tight mb-2 text-orange-400">{bot.name}</h1>
    <p class="text-sm text-slate-400 mb-8">Manage your server and the modules installed in it.</p>
    <a
      href="/api/auth/login"
      class="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-sm font-semibold text-orange-400 ring-1 ring-orange-500/30 transition-all"
    >
      Log in with Discord
    </a>
  </div>
</div>
