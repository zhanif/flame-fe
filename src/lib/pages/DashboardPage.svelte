<script lang="ts">
  import { bot } from '$lib/stores/bot.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { Lock, Server } from '@lucide/svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    session.loadGuilds();
  });

  // Servers with the bot first.
  const guilds = $derived([...session.guilds].sort((a, b) => Number(b.bot_present) - Number(a.bot_present)));
  const addedCount = $derived(guilds.filter(g => g.bot_present).length);
</script>

<div class="max-w-5xl mx-auto px-6 py-10">
  <h1 class="text-2xl font-bold text-slate-100">Your servers</h1>
  <p class="text-sm text-slate-500 mt-1 mb-6">
    {session.guildsLoading ? 'Loading…' : `${addedCount} of ${guilds.length} servers have ${bot.name} added`}
  </p>

  {#if session.guildsLoading && guilds.length === 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each Array(6) as _}
        <div class="flex items-center gap-3 p-4 rounded-xl bg-slate-800/30" aria-hidden="true">
          <div class="w-10 h-10 rounded-xl bg-slate-700/40 animate-pulse shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3 w-2/3 rounded bg-slate-700/40 animate-pulse"></div>
            <div class="h-2.5 w-1/3 rounded bg-slate-700/30 animate-pulse"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if guilds.length === 0}
    <div class="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-10 text-center">
      <Server class="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <p class="text-sm text-slate-400">You don't manage any server yet.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each guilds as guild (guild.id)}
        <div class="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4 {guild.bot_present ? '' : 'opacity-70'}">
          <div class="flex items-center gap-3">
            {#if guild.icon_url}
              <img src={guild.icon_url} alt="" class="w-10 h-10 rounded-xl shrink-0 {guild.bot_present ? '' : 'grayscale'}" />
            {:else}
              <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold shrink-0">
                {guild.name.charAt(0).toUpperCase()}
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-200 truncate">{guild.name}</p>
              <p class="text-xs text-slate-500">
                {guild.member_count ? `${guild.member_count.toLocaleString()} members` : guild.access}
              </p>
            </div>
          </div>

          <div class="mt-3">
            {#if guild.bot_present}
              <button
                onclick={() => router.guild(guild.id)}
                class="w-full px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/20 transition-all cursor-pointer"
              >
                Manage
              </button>
            {:else if guild.access === 'admin' && bot.inviteUrl}
              <a
                href="{bot.inviteUrl}&guild_id={guild.id}"
                target="_blank"
                rel="noopener"
                class="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-xs font-semibold text-slate-300 transition-all"
              >
                Add {bot.name}
              </a>
            {:else}
              <div class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/30 text-xs font-medium text-slate-500">
                <Lock class="w-3 h-3" /> Bot not in this server
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
