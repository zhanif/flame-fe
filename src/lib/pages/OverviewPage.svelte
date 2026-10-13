<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Card from '$lib/components/Card.svelte';
  import ModulesSection from '$lib/components/ModulesSection.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { api, type ModuleEntry } from '$lib/api/endpoints';
  import { session } from '$lib/stores/session.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, type Tone, toneText } from '$lib/ui';
  import { Blocks, Hash, Package, Shield, Users } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let modules: ModuleEntry[] = $state([]);
  let roleCount: number | null = $state(null);
  let channelCount: number | null = $state(null);
  let loading = $state(true);

  const guild = $derived(session.guild(guildId));
  const installed = $derived(modules.filter(m => m.installed).length);

  const stats: () => { label: string; value: number | null; icon: Component<any>; tone: Tone }[] = () => [
    { label: 'Installed', value: installed, icon: Blocks, tone: 'emerald' },
    { label: 'Available', value: modules.length - installed, icon: Package, tone: 'sky' },
    { label: 'Roles', value: roleCount, icon: Shield, tone: 'violet' },
    { label: 'Channels', value: channelCount, icon: Hash, tone: 'amber' },
  ];

  async function reloadModules() {
    try {
      modules = await api.modules(guildId);
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  onMount(async () => {
    const [mods, roles, channels] = await Promise.allSettled([api.modules(guildId), api.roles(guildId), api.channels(guildId)]);
    if (mods.status === 'fulfilled') modules = mods.value;
    else toast('error', mods.reason?.message ?? 'Could not load modules');
    if (roles.status === 'fulfilled') roleCount = roles.value.length;
    if (channels.status === 'fulfilled') channelCount = channels.value.length;
    loading = false;
  });
</script>

<PageHeader page="dashboard" description="Your server at a glance" />

<div class="space-y-5">
  {#if guild}
    <Card class="flex flex-col lg:flex-row lg:items-center gap-5">
      <div class="flex items-center gap-3.5 min-w-0 lg:flex-1">
        <Avatar src={guild.icon_url} name={guild.name} id={guild.id} />
        <div class="min-w-0">
          <h2 class="font-display text-base font-extrabold text-zinc-100 truncate leading-6">{guild.name}</h2>
          <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5">
            <span class="flex items-center gap-1.5 text-xs text-zinc-400">
              <Users class="w-3.5 h-3.5 text-zinc-500" />
              {guild.member_count ? `${guild.member_count.toLocaleString()} members` : 'Members unavailable'}
            </span>
            <Badge tone="success">Online</Badge>
            <Badge tone={guild.access === 'admin' ? 'brand' : 'info'}>{guild.access === 'admin' ? 'Admin' : 'Moderator'}</Badge>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-4 pt-5 lg:pt-0 border-t lg:border-t-0 border-zinc-700/50 lg:flex lg:divide-x divide-zinc-700/50">
        {#each stats() as stat (stat.label)}
          <div class="lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <p class="flex items-center gap-1.5 {caps} text-zinc-500">
              <stat.icon class="w-3.5 h-3.5 {toneText[stat.tone]}" />{stat.label}
            </p>
            {#if loading}
              <div class="h-6 w-8 rounded bg-zinc-700/40 animate-pulse mt-1.5" aria-hidden="true"></div>
            {:else}
              <p class="font-display text-xl font-extrabold text-zinc-100 leading-7 mt-0.5">{stat.value ?? '-'}</p>
            {/if}
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <ModulesSection {guildId} {isAdmin} {modules} {loading} onchange={reloadModules} />
</div>
