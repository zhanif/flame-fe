<script lang="ts">
  import { bot } from '$lib/stores/bot.svelte';
  import { type GuildPage, router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { ArrowLeft, Blocks, ScrollText, Settings, Terminal } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import AuditPage from './AuditPage.svelte';
  import ModulesPage from './ModulesPage.svelte';
  import SettingsPage from './SettingsPage.svelte';
  import SlashPage from './SlashPage.svelte';

  let { guildId }: { guildId: string } = $props();

  onMount(() => {
    if (!session.guilds.length) session.loadGuilds();
  });

  const guild = $derived(session.guild(guildId));
  const isAdmin = $derived(guild?.access === 'admin');
  const page = $derived(router.page);

  // Administration is for admins only; moderators just see the module catalog.
  const nav: { id: GuildPage; label: string; icon: typeof Blocks; adminOnly: boolean }[] = [
    { id: 'modules', label: 'Modules', icon: Blocks, adminOnly: false },
    { id: 'slash', label: 'Slash', icon: Terminal, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: false },
    { id: 'audit', label: 'Audit logs', icon: ScrollText, adminOnly: true },
  ];
  const visibleNav = $derived(nav.filter(item => !item.adminOnly || isAdmin));
  const current = $derived(visibleNav.some(n => n.id === page) ? page : 'modules');
</script>

<div class="min-h-screen flex">
  <aside class="w-64 shrink-0 bg-slate-900 border-r border-slate-800/60 flex flex-col">
    <div class="px-4 py-4 border-b border-slate-800/40 flex items-center gap-3">
      {#if bot.avatar}
        <img src={bot.avatar} alt="" class="w-9 h-9 rounded-full ring-2 ring-orange-500/30" />
      {/if}
      <p class="font-extrabold text-slate-100">{bot.name}</p>
    </div>

    <div class="px-4 py-3">
      <button onclick={() => router.home()} class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 text-left cursor-pointer ring-1 ring-slate-700/30">
        <ArrowLeft class="w-4 h-4 text-slate-400" />
        <span class="text-sm font-semibold text-slate-200 truncate">{guild?.name ?? 'Server'}</span>
      </button>
    </div>

    <nav class="px-4 pb-4 space-y-1">
      {#each visibleNav as item (item.id)}
        <button
          onclick={() => router.guild(guildId, item.id)}
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer {current === item.id
            ? 'bg-orange-500/10 text-orange-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
        >
          <item.icon class="w-4 h-4 shrink-0" />{item.label}
        </button>
      {/each}
    </nav>
  </aside>

  <main class="flex-1 min-w-0 p-8">
    <div class="max-w-5xl">
      {#if !guild && session.guildsLoading}
        <p class="text-sm text-slate-500">Loading…</p>
      {:else if !guild || !guild.bot_present}
        <div class="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-8 max-w-md">
          <h2 class="text-sm font-bold text-slate-200">This server isn't available</h2>
          <p class="text-xs text-slate-500 mt-1">The bot isn't in it, or you don't have access to manage it.</p>
        </div>
      {:else if current === 'modules'}
        <ModulesPage {guildId} {isAdmin} />
      {:else if current === 'slash'}
        <SlashPage {guildId} />
      {:else if current === 'settings'}
        <SettingsPage {guildId} {isAdmin} />
      {:else if current === 'audit'}
        <AuditPage {guildId} />
      {/if}
    </div>
  </main>
</div>
