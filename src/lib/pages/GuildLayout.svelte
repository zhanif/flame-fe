<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import { bot } from '$lib/stores/bot.svelte';
  import { type GuildPage, router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { NAV_ORDER, PAGES, providePageTone } from '$lib/nav';
  import { toneText } from '$lib/ui';
  import { ArrowLeft } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import AuditPage from './AuditPage.svelte';
  import OverviewPage from './OverviewPage.svelte';
  import SettingsPage from './SettingsPage.svelte';
  import SlashPage from './SlashPage.svelte';

  let { guildId }: { guildId: string } = $props();

  onMount(() => {
    if (!session.guilds.length) session.loadGuilds();
  });

  const guild = $derived(session.guild(guildId));
  const isAdmin = $derived(guild?.access === 'admin');
  const page = $derived(router.page);

  // Administration is for admins only; moderators just see the dashboard and settings.
  const visibleNav = $derived(NAV_ORDER.filter(id => !PAGES[id].adminOnly || isAdmin));
  providePageTone(() => PAGES[current].tone);

  // Without the bot (or without access) there is nothing to navigate: only the back button stays.
  const available = $derived(!!guild?.bot_present);
  const current = $derived(visibleNav.includes(page) ? page : 'dashboard');
</script>

<div class="min-h-screen flex">
  <aside class="w-64 shrink-0 sticky top-0 h-screen bg-zinc-900 border-r border-zinc-800/60 flex flex-col">
    <div class="px-5 h-[69px] shrink-0 border-b border-zinc-800/50 flex items-center gap-3">
      {#if bot.avatar}
        <img src={bot.avatar} alt="" class="w-9 h-9 rounded-full ring-2 ring-orange-500/40" />
      {/if}
      <p class="font-display text-base font-extrabold tracking-tight text-zinc-100">{bot.name}</p>
    </div>

    <div class="px-3 pt-4 pb-2">
      <button onclick={() => router.home()} class="group w-full h-10 flex items-center gap-3 px-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 text-left cursor-pointer ring-1 ring-zinc-700/40 hover:ring-orange-500/30 transition">
        <ArrowLeft class="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition-colors" />
        {#if guild}
          <span class="text-sm font-semibold text-zinc-200 truncate">{guild.name}</span>
        {:else if session.guildsLoading}
          <span class="h-3.5 w-24 rounded bg-zinc-700/40 animate-pulse" aria-hidden="true"></span>
        {:else}
          <span class="text-sm font-semibold text-zinc-200 truncate">Server</span>
        {/if}
      </button>
    </div>

    {#if available}
      <nav class="px-3 pt-3 space-y-1">
        <p class="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Administration</p>
        {#each visibleNav as id (id)}
          {@const item = PAGES[id]}
          {@const active = current === id}
          <button
            onclick={() => router.guild(guildId, id)}
            class="group w-full h-10 flex items-center gap-3 px-3 rounded-xl text-left text-sm font-medium transition cursor-pointer {active
              ? 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'}"
          >
            <item.icon class="w-[18px] h-[18px] shrink-0 {toneText[item.tone]}" />
            {item.label}
          </button>
        {/each}
      </nav>
    {:else if !guild && session.guildsLoading}
      <div class="px-3 pt-3 space-y-1" aria-hidden="true">
        <div class="mx-3 mb-2.5 h-3 w-12 rounded bg-zinc-700/40 animate-pulse"></div>
        {#each Array(4) as _}
          <div class="h-10 px-3 flex items-center gap-3">
            <div class="w-[18px] h-[18px] rounded bg-zinc-700/40 animate-pulse"></div>
            <div class="h-3 w-20 rounded bg-zinc-700/40 animate-pulse"></div>
          </div>
        {/each}
      </div>
    {/if}
  </aside>

  <main class="flex-1 min-w-0 p-5">
    <div>
      {#if !guild && session.guildsLoading}
        <div aria-hidden="true">
          <div class="flex items-center gap-3 -mx-5 -mt-5 mb-5 px-5 h-[69px] border-b border-zinc-800/50">
            <div class="w-9 h-9 rounded-xl bg-zinc-700/40 animate-pulse"></div>
            <div class="space-y-2">
              <div class="h-3 w-28 rounded bg-zinc-700/40 animate-pulse"></div>
              <div class="h-2.5 w-52 rounded bg-zinc-700/30 animate-pulse"></div>
            </div>
          </div>
          <Card>
            <FormSkeleton fields={2} />
          </Card>
        </div>
      {:else if !guild || !guild.bot_present}
        <EmptyState fill kind="server" title="This server isn't available" description="The bot isn't in it, or you don't have access to manage it." />
      {:else}
        {#key current}
          <div in:fly={{ y: 8, duration: 220 }}>
            {#if current === 'dashboard'}
              <OverviewPage {guildId} {isAdmin} />
            {:else if current === 'slash'}
              <SlashPage {guildId} />
            {:else if current === 'settings'}
              <SettingsPage {guildId} {isAdmin} />
            {:else if current === 'audit'}
              <AuditPage {guildId} />
            {/if}
          </div>
        {/key}
      {/if}
    </div>
  </main>
</div>
