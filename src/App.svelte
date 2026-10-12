<script lang="ts">
  import Toasts from '$lib/components/Toasts.svelte';
  import DashboardPage from '$lib/pages/DashboardPage.svelte';
  import GuildLayout from '$lib/pages/GuildLayout.svelte';
  import LandingPage from '$lib/pages/LandingPage.svelte';
  import { bot } from '$lib/stores/bot.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    bot.load();
    session.check();
  });
</script>

{#if session.loading}
  <div class="min-h-screen flex items-center justify-center bg-slate-950" aria-hidden="true">
    <div class="w-10 h-10 rounded-full bg-slate-800 animate-pulse"></div>
  </div>
{:else if !session.me}
  <LandingPage />
{:else if router.guildId}
  <GuildLayout guildId={router.guildId} />
{:else}
  <DashboardPage />
{/if}

<Toasts />
