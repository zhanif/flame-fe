<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import LegalLinks from '$lib/components/LegalLinks.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { bot } from '$lib/stores/bot.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { Check, Lock, Plus, Server } from '@lucide/svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    session.loadGuilds();
  });

  // Servers with the bot first.
  const guilds = $derived([...session.guilds].sort((a, b) => Number(b.bot_present) - Number(a.bot_present)));
  const addedCount = $derived(guilds.filter(g => g.bot_present).length);
  const loading = $derived(session.guildsLoading && guilds.length === 0);
</script>

<div class="max-w-5xl mx-auto p-5 min-h-screen flex flex-col">
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      {#if bot.avatar}
        <img src={bot.avatar} alt="" class="w-10 h-10 rounded-full ring-2 ring-orange-500/40" />
      {/if}
      <span class="font-display text-lg font-extrabold tracking-tight text-zinc-100">{bot.name}</span>
    </div>
    <ThemeToggle />
  </div>

  <div class="mt-10 mb-6">
    <h1 class="font-display text-3xl font-extrabold tracking-tight text-zinc-100">
      Your <span class="text-orange-400">servers</span>
    </h1>
    {#if loading}
      <div class="h-5 mt-2 flex items-center" aria-hidden="true"><div class="h-3 w-56 rounded bg-zinc-700/40 animate-pulse"></div></div>
    {:else}
      <p class="text-sm text-zinc-500 mt-2 h-5">{addedCount} of {guilds.length} servers have {bot.name} added</p>
    {/if}
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each Array(6) as _}
        <Card>
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-zinc-700/40 animate-pulse shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 w-2/3 rounded bg-zinc-700/40 animate-pulse"></div>
              <div class="h-2.5 w-1/3 rounded bg-zinc-700/30 animate-pulse"></div>
            </div>
          </div>
          <div class="h-7 rounded-lg bg-zinc-700/30 animate-pulse mt-4"></div>
        </Card>
      {/each}
    </div>
  {:else if guilds.length === 0}
    <Card class="text-center py-10">
      <Server class="w-8 h-8 text-zinc-500 mx-auto mb-3" />
      <p class="text-sm font-semibold text-zinc-200">No servers yet</p>
      <p class="text-xs text-zinc-500 mt-1">Servers you can manage will appear here.</p>
    </Card>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each guilds as guild (guild.id)}
        <Card interactive class={guild.bot_present ? '' : 'opacity-75'}>
          <div class="flex items-center gap-3">
            <Avatar src={guild.icon_url} name={guild.name} id={guild.id} dim={!guild.bot_present} />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-zinc-100 truncate">{guild.name}</p>
              <p class="text-xs text-zinc-500 mt-0.5">
                {guild.member_count ? `${guild.member_count.toLocaleString()} members` : guild.access}
              </p>
            </div>
            {#if guild.bot_present}
              <Badge tone="success"><Check class="w-3 h-3" /> Added</Badge>
            {/if}
          </div>

          <div class="mt-4">
            {#if guild.bot_present}
              <Button variant="soft" size="sm" class="w-full" onclick={() => router.guild(guild.id)}>Manage</Button>
            {:else if guild.access === 'admin' && bot.inviteUrl}
              <Button size="sm" class="w-full" href="{bot.inviteUrl}&guild_id={guild.id}" target="_blank" rel="noopener">
                <Plus class="w-3.5 h-3.5" /> Add {bot.name}
              </Button>
            {:else}
              <div class="h-7 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-700/30 text-xs font-medium text-zinc-500">
                <Lock class="w-3 h-3" /> Bot not in this server
              </div>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/if}

  <footer class="mt-auto pt-12 pb-1">
    <div class="pt-5 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
      <p>&copy; {new Date().getFullYear()} {bot.name}. Not affiliated with Discord.</p>
      <LegalLinks />
    </div>
  </footer>
</div>
