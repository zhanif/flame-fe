<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelsPicker from '$lib/components/ChannelsPicker.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type AutoremoverConfig, type AutoremoverItem, type AutoremoverView, type DiscordChannel } from '$lib/api/endpoints';
  import { formatDuration } from '$lib/duration';
  import { onlyDigits, restrictTo } from '$lib/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { td, th } from '$lib/ui';
  import { Clock, ScrollText, Settings, Timer, X } from '@lucide/svelte';
  import { onDestroy, onMount, untrack } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let tab = $state('scheduled');
  let config: AutoremoverConfig | null = $state(null);
  let channels: DiscordChannel[] = $state([]);

  // The settings form: what is typed, until Save.
  let enabled = $state(false);
  let ttl = $state('600');
  let targets: string[] = $state([]);
  let saving = $state(false);

  let items: AutoremoverItem[] = $state([]);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);
  let refresh: ReturnType<typeof setInterval> | undefined;

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const where = (id: string) => channels.find(c => c.id === id)?.name ?? id;

  // The time before deletion, in seconds, and what it means in words once it passes a minute.
  const ttlNumber = $derived(ttl.trim() === '' ? NaN : Number(ttl));
  const ttlError = $derived.by(() => {
    const current: AutoremoverConfig | null = config;
    if (!current) return null;
    if (!Number.isInteger(ttlNumber)) return 'Enter a whole number of seconds';
    if (ttlNumber < current.limits.min_ttl_seconds) return `At least ${formatDuration(current.limits.min_ttl_seconds)}`;
    if (ttlNumber > current.limits.max_ttl_seconds) return `At most ${formatDuration(current.limits.max_ttl_seconds)}`;
    return null;
  });
  const ttlHint = $derived(ttlError ?? (ttlNumber >= 60 ? formatDuration(ttlNumber) : `${ttlNumber} seconds`));
  const dirty = $derived.by(() => {
    const current: AutoremoverConfig | null = config;
    return !!current && (enabled !== current.enabled || ttlNumber !== current.ttl_seconds || targets.join(',') !== current.target_ids.join(','));
  });

  function apply(next: AutoremoverConfig) {
    config = next;
    enabled = next.enabled;
    ttl = String(next.ttl_seconds);
    targets = [...next.target_ids];
  }

  async function save() {
    if (!config || ttlError) return;
    saving = true;
    try {
      apply(await api.autoremover.updateConfig(guildId, { enabled, ttl_seconds: ttlNumber, target_ids: targets }));
      toast('success', 'Settings saved', 'New messages use the new time. Messages already marked keep their own.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function loadItems(view: AutoremoverView, quiet = false) {
    if (!quiet) loading = true;
    try {
      const res = await api.autoremover.items(guildId, { view, page, limit });
      items = res.items;
      total = res.pagination.total;
      loaded = true;
    } catch (e: any) {
      if (!quiet) toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  async function cancel(item: AutoremoverItem) {
    try {
      await api.autoremover.cancel(guildId, item.id);
      toast('success', 'Deletion cancelled', 'The message stays.');
      await loadItems('scheduled');
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  // A tab with a list starts from page one with a fresh list.
  $effect(() => {
    const current = tab;
    if (current === 'settings') return;
    untrack(() => {
      page = 1;
      loaded = false;
      void loadItems(current as AutoremoverView);
    });
  });

  const goTo = (p: number) => {
    page = p;
    void loadItems(tab as AutoremoverView);
  };
  const setLimit = (l: number) => {
    limit = l;
    page = 1;
    void loadItems(tab as AutoremoverView);
  };

  onMount(async () => {
    const [loadedConfig, channelList] = await Promise.allSettled([api.autoremover.config(guildId), api.channels(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (loadedConfig.status === 'fulfilled') apply(loadedConfig.value);
    else toast('error', loadedConfig.reason?.message ?? 'Could not load the autoremover settings');

    // What is waiting changes by itself, so that list quietly follows along.
    refresh = setInterval(() => {
      if (tab === 'scheduled') void loadItems('scheduled', true);
    }, 15_000);
  });
  onDestroy(() => clearInterval(refresh));

  const statusTone = { deleted: 'success', failed: 'danger', cancelled: 'neutral', pending: 'info' } as const;
</script>

<PageHeader module="autoremover" description="Deletes messages with attachments after a set time" />

<div class="space-y-5">
  <Tabs
    bind:value={tab}
    tabs={[
      { id: 'scheduled', label: 'Scheduled', icon: Clock },
      { id: 'history', label: 'History', icon: ScrollText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]}
  />

  {#if config}<WarningBanner warnings={config.warnings} />{/if}

  {#if tab === 'settings'}
    <Card>
      <SectionTitle icon={Timer} title="Autoremover" class="mb-5" />
      {#if !config}
        <div class="space-y-5" aria-hidden="true">
          {#each Array(3) as _}
            <div class="flex items-center justify-between gap-8">
              <div class="space-y-2"><div class="h-3.5 w-32 rounded bg-zinc-700/40 animate-pulse"></div><div class="h-2.5 w-64 rounded bg-zinc-800/40 animate-pulse"></div></div>
              <div class="h-9 w-56 rounded-lg bg-zinc-800/40 animate-pulse"></div>
            </div>
          {/each}
        </div>
      {:else}
        <SettingRow title="Autoremover" hint="Deletes messages with attachments in the watched channel once their time is up.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{enabled ? 'On' : 'Off'}</span>
            <Toggle on={enabled} disabled={!isAdmin} label="Autoremover on" onclick={() => (enabled = !enabled)} />
          </div>
        </SettingRow>

        <SettingRow title="Watched channels" hint="Messages with attachments here are deleted. A forum covers its threads and a category its channels. Pinned messages are kept. Up to {config.limits.max_targets} at the moment.">
          <ChannelsPicker {channels} selected={targets} onchange={next => (targets = next)} max={config.limits.max_targets} disabled={!isAdmin} label="Watched channels" />
        </SettingRow>

        <SettingRow title="Time before deletion" hint={ttlError ?? `In seconds. ${ttlNumber >= 60 ? `That is ${formatDuration(ttlNumber)}.` : ''}`.trim()} error={!!ttlError}>
          <div class="sm:flex sm:flex-col sm:items-end">
            <Input bind:value={ttl} inputmode="numeric" maxlength={6} placeholder="600" oninput={restrictTo(onlyDigits, v => (ttl = v))} aria-label="Time before deletion in seconds" disabled={!isAdmin} class="w-full sm:w-32" />
            {#if !ttlError && ttlNumber >= 60}<p class="mt-1.5 text-xs font-medium text-zinc-300">{formatDuration(ttlNumber)}</p>{/if}
          </div>
        </SettingRow>

        {#if isAdmin}
          <div class="flex justify-end pt-5">
            <Button variant="primary" onclick={save} disabled={!dirty || !!ttlError || saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        {/if}
      {/if}
    </Card>
  {:else if loaded && total === 0}
    <EmptyState
      kind="log"
      title={tab === 'scheduled' ? 'Nothing is scheduled' : 'No history yet'}
      description={tab === 'scheduled'
        ? 'Messages with attachments in the watched channel wait here until their time comes.'
        : 'Deleted, failed and cancelled messages are listed here.'}
    />
  {:else}
    <Card flush>
      {#if !loaded}
        <TableSkeleton columns={tab === 'scheduled' ? ['w-16', 'w-64', 'flex-1', 'w-44', 'w-52', 'w-16'] : ['w-16', 'w-64', 'flex-1', 'w-44', 'w-40', 'w-44']} rows={5} rowHeight="h-14" />
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
              <th class="{th} w-16">#</th>
              <th class="{th} w-64">Author</th>
              <th class={th}>Files</th>
              <th class="{th} w-44">Channel</th>
              {#if tab === 'scheduled'}
                <th class="{th} w-52">Deletes</th>
                <th class="{th} w-16"><span class="sr-only">Actions</span></th>
              {:else}
                <th class="{th} w-40">Result</th>
                <th class="{th} w-44">When</th>
              {/if}
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each items as item, i (item.id)}
              <tr class="hover:bg-zinc-800/30 transition-colors">
                <td class="{cell} text-zinc-500">{(page - 1) * limit + i + 1}</td>
                <td class={cell}>{#if item.author}<ActorCell actor={item.author} />{/if}</td>
                <td class="{cell} text-zinc-200"><span class="line-clamp-2 break-all">{item.summary}</span></td>
                <td class="{cell} text-zinc-400 whitespace-nowrap">#{where(item.channel_id)}</td>
                {#if tab === 'scheduled'}
                  <td class="{cell} whitespace-nowrap">
                    <p class="text-zinc-200">in {formatDuration((new Date(item.delete_at).getTime() - Date.now()) / 1000) || '0s'}</p>
                    <p class="text-xs text-zinc-500">{when(item.delete_at)}</p>
                  </td>
                  <td class="{cell} text-right">
                    <Button variant="ghost" size="icon" aria-label="Cancel this deletion" title="Cancel this deletion" onclick={() => cancel(item)}>
                      <X class="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </td>
                {:else}
                  <td class={cell}>
                    <Badge tone={statusTone[item.status]}>{item.status === 'deleted' ? 'Deleted' : item.status === 'failed' ? 'Failed' : 'Cancelled'}</Badge>
                    {#if item.error}<p class="mt-0.5 text-xs text-zinc-500 truncate" title={item.error}>{item.error}</p>{/if}
                  </td>
                  <td class="{cell} text-zinc-500 whitespace-nowrap">{item.processed_at ? when(item.processed_at) : ''}</td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
        <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
      {/if}
    </Card>
  {/if}
</div>
