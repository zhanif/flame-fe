<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import ItemsTab from '$lib/modules/invasion/items/ItemsTab.svelte';
  import PlayersTab from '$lib/modules/invasion/players/PlayersTab.svelte';
  import RoundsTab from '$lib/modules/invasion/rounds/RoundsTab.svelte';
  import SettingsSkeleton from '$lib/modules/invasion/settings/SettingsSkeleton.svelte';
  import SettingsTab from '$lib/modules/invasion/settings/SettingsTab.svelte';
  import StatisticSkeleton from '$lib/modules/invasion/statistic/StatisticSkeleton.svelte';
  import StatisticTab from '$lib/modules/invasion/statistic/StatisticTab.svelte';
  import TransactionsTab from '$lib/modules/invasion/transactions/TransactionsTab.svelte';
  import { api } from '$lib/api/endpoints';
  import type { InvasionConfig, InvasionOverview } from '$lib/api/endpoints';
  import { BarChart3, Coins, Package, ScrollText, Settings, Users } from '@lucide/svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/utils/url-param';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const tabParam = urlParam('tab', 'statistic');
  const tab = $derived(tabParam.value);

  let overview: InvasionOverview | null = $state(null);
  let config: InvasionConfig | null = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let dirty = $state(false);
  let settingsTab: any = $state(null);

  onMount(async () => {
    const [counts, settings] = await Promise.allSettled([api.invasion.overview(guildId), api.invasion.config(guildId)]);
    if (counts.status === 'fulfilled') overview = counts.value;
    if (settings.status === 'fulfilled') config = settings.value;
    else toast('error', settings.reason?.message ?? 'Could not load the invasion settings');
    loading = false;
  });

  const tabs = [
    { id: 'statistic', label: 'Statistic', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const dataTabs = [
    { id: 'rounds', label: 'Rounds', icon: ScrollText },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: Coins },
  ];
</script>

<PageHeader module="invasion" description="Your server's invasion at a glance" />

<Tabs bind:value={tabParam.value} {tabs} right={dataTabs} />

<div class="mt-5 space-y-5">
  {#if config}
    <WarningBanner warnings={config.warnings} />
  {/if}

  {#if tab === 'statistic'}
    {#if loading}
      <StatisticSkeleton />
    {:else}
      <StatisticTab {overview} />
    {/if}
  {:else if tab === 'settings'}
    {#if config}
      <SettingsTab bind:this={settingsTab} {guildId} {config} {isAdmin} onSaved={next => (config = next)} bind:saving bind:dirty />
      <div class="flex justify-end">
        <SaveButton onclick={() => settingsTab?.save()} disabled={!isAdmin || !dirty} {saving} />
      </div>
    {:else}
      <SettingsSkeleton />
    {/if}
  {:else if tab === 'items'}
    <ItemsTab {guildId} {isAdmin} />
  {:else if tab === 'rounds'}
    <RoundsTab />
  {:else if tab === 'players'}
    <PlayersTab />
  {:else if tab === 'transactions'}
    <TransactionsTab />
  {/if}
</div>
