<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ChannelChip from '$lib/components/ChannelChip.svelte';
  import ChannelsPicker from '$lib/components/ChannelsPicker.svelte';
  import ChipPicker from '$lib/components/ChipPicker.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type AutoremoverConfig, type AutoremoverItem, type AutoremoverKind, type DiscordChannel } from '$lib/api/endpoints';
  import { formatDuration } from '$lib/duration';
  import { onlyDigits, restrictTo } from '$lib/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlNumber, urlParam } from '$lib/url-param';
  import { label, td, th } from '$lib/ui';
  import { ExternalLink, Info, ListChecks, ScrollText, Settings, Timer, X } from '@lucide/svelte';
  import { onDestroy, onMount, untrack } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let info = $state(false);
  // The hint follows the tab: each one explains what is in front of the person, not the whole module.
  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    messages: {
      title: 'How a message is removed',
      steps: [
        { text: 'A message sent in the watched channel that matches what is removed (images, videos, files or every message) is marked. Each row here is one marked message.' },
        { text: 'Its delete time is the moment it was sent plus the time set in Settings. Until then it is waiting.' },
        { text: 'A background task looks for messages whose time is up every few seconds and deletes them. One that is already gone counts as done; one Discord refuses to delete is recorded with the reason and not tried again. A waiting deletion can be cancelled from its row, and the message then stays for good.' },
        { text: 'A message pinned after it was marked is kept, if pinned messages are excluded.' },
      ],
    },
    settings: {
      title: 'How these settings apply',
      steps: [
        { text: 'The watched channel decides where messages are picked up. A message is only marked when it is sent there.' },
        { text: 'The time is counted from when a message is sent, not from now. Changing it only affects messages sent afterwards; the ones already marked keep their delete time.' },
        { text: 'What to remove narrows which messages are marked. Moderators, admins and pinned messages can each be left alone.' },
      ],
    },
  };
  // Where the person is lives in the address: the tab, the page and the status filter.
  const tabParam = urlParam('tab', 'messages');
  const tab = $derived(tabParam.value);
  const pageParam = urlNumber('page');
  const page = $derived(pageParam.value);
  const statusParam = urlParam('status');
  const statusFilter = $derived(statusParam.value);
  const hint = $derived(HINTS[tab] ?? HINTS.messages);
  let config: AutoremoverConfig | null = $state(null);
  let channels: DiscordChannel[] = $state([]);

  // The settings form: what is typed, until Save.
  let enabled = $state(false);
  let ttl = $state('600');
  let targets: string[] = $state([]);
  let kinds: string[] = $state(['image']);
  let excludeMods = $state(false);
  let excludeAdmins = $state(false);
  let excludePinned = $state(true);
  let saving = $state(false);

  let items: AutoremoverItem[] = $state([]);
  let limit = $state(10);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);
  let now = $state(Date.now());
  let logTarget: AutoremoverItem | null = $state(null);
  let refresh: ReturnType<typeof setInterval> | undefined;

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const channelOf = (id: string) => channels.find(c => c.id === id);

  // How long a waiting message has left, in words.
  const timeLeft = (item: AutoremoverItem) => {
    const seconds = Math.ceil((new Date(item.delete_at).getTime() - now) / 1000);
    return seconds > 0 ? `in ${formatDuration(seconds)}` : 'Deleting now';
  };

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
  // A message is removed when it matches any of the kinds picked here.
  const KIND_ITEMS = [
    { id: 'image', name: 'Images' },
    { id: 'video', name: 'Videos' },
    { id: 'file', name: 'Any file' },
    { id: 'message', name: 'Every message' },
  ];
  const sameKinds = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');
  const dirty = $derived.by(() => {
    const current: AutoremoverConfig | null = config;
    return (
      !!current &&
      (enabled !== current.enabled ||
        ttlNumber !== current.ttl_seconds ||
        targets.join(',') !== current.target_ids.join(',') ||
        !sameKinds(kinds, current.remove_kinds) ||
        excludeMods !== current.exclude_mods ||
        excludeAdmins !== current.exclude_admins ||
        excludePinned !== current.exclude_pinned)
    );
  });

  function apply(next: AutoremoverConfig) {
    config = next;
    enabled = next.enabled;
    ttl = String(next.ttl_seconds);
    targets = [...next.target_ids];
    kinds = [...next.remove_kinds];
    excludeMods = next.exclude_mods;
    excludeAdmins = next.exclude_admins;
    excludePinned = next.exclude_pinned;
  }

  async function save() {
    if (!config || ttlError || kinds.length === 0) return;
    saving = true;
    try {
      apply(await api.autoremover.updateConfig(guildId, {
          enabled,
          ttl_seconds: ttlNumber,
          target_ids: targets,
          remove_kinds: kinds as AutoremoverKind[],
          exclude_mods: excludeMods,
          exclude_admins: excludeAdmins,
          exclude_pinned: excludePinned,
        }));
      toast('success', 'Settings saved', 'New messages use the new time. Messages already marked keep their own.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function loadItems(quiet = false) {
    if (!quiet) loading = true;
    try {
      const res = await api.autoremover.items(guildId, { status: statusFilter, page, limit });
      items = res.items;
      total = res.pagination.total;
      loaded = true;
      now = Date.now();
    } catch (e: any) {
      if (!quiet) toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  let cancelTarget: AutoremoverItem | null = $state(null);
  let cancelling = $state(false);
  async function cancel() {
    if (!cancelTarget) return;
    cancelling = true;
    try {
      await api.autoremover.cancel(guildId, cancelTarget.id);
      toast('success', 'Deletion cancelled', 'The message stays.');
      cancelTarget = null;
      await loadItems();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      cancelling = false;
    }
  }

  // The messages are read whenever the page, its size or the status filter changes, the browser's Back included.
  $effect(() => {
    void [page, limit, statusFilter];
    untrack(() => void loadItems());
  });
  const goTo = (p: number) => (pageParam.value = p);
  const setLimit = (l: number) => {
    limit = l;
    pageParam.value = 1;
  };
  const refilter = () => (pageParam.value = 1);

  onMount(async () => {
    const [loadedConfig, channelList] = await Promise.allSettled([api.autoremover.config(guildId), api.channels(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (loadedConfig.status === 'fulfilled') apply(loadedConfig.value);
    else toast('error', loadedConfig.reason?.message ?? 'Could not load the autoremover settings');

    // A short time before deletion leaves only seconds to see a waiting message, so the list
    // follows along quietly, and the countdowns tick between refreshes.
    refresh = setInterval(() => {
      now = Date.now();
      if (tab === 'messages' && !loading) void loadItems(true);
    }, 4_000);
  });
  onDestroy(() => clearInterval(refresh));

  const statusTone = { pending: 'info', deleted: 'success', failed: 'danger', cancelled: 'neutral' } as const;
  const statusLabel = { pending: 'Waiting', deleted: 'Deleted', failed: 'Failed', cancelled: 'Cancelled' } as const;

  // What happened, in a sentence, for the log of a message.
  const outcome = (item: AutoremoverItem) =>
    item.status === 'pending'
      ? 'Waiting for its time. It is deleted then, unless someone cancels it.'
      : item.status === 'deleted'
        ? (item.error ?? 'The message was deleted.')
        : (item.error ?? (item.status === 'failed' ? 'Discord refused to delete it.' : 'It was cancelled.'));
  const jump = (item: AutoremoverItem) => `https://discord.com/channels/${guildId}/${item.channel_id}/${item.message_id}`;
</script>

<PageHeader module="autoremover" description="Deletes messages after a set time" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tabParam.value}
      tabs={[
        { id: 'messages', label: 'Messages', icon: ListChecks, count: loaded && !statusFilter ? total : null },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
  </div>

  <InfoPanel show={info} title={hint.title} tone="green" steps={hint.steps} />

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
        <SettingRow title="Autoremover" hint="Deletes the messages you choose in the watched channel once their time is up.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{enabled ? 'On' : 'Off'}</span>
            <Toggle on={enabled} disabled={!isAdmin} label="Autoremover on" onclick={() => (enabled = !enabled)} />
          </div>
        </SettingRow>

        <SettingRow title="Watched channels" hint="Messages here can be deleted. A forum covers its threads. Up to {config.limits.max_targets} at the moment.">
          <ChannelsPicker {channels} selected={targets} onchange={next => (targets = next)} max={config.limits.max_targets} disabled={!isAdmin} label="Watched channels" />
        </SettingRow>

        <SettingRow
          title="What to remove"
          hint={kinds.length === 0
            ? 'Pick at least one.'
            : 'A message is deleted when it matches any of these. Images and videos need one attached; Any file means any attachment; Every message includes text-only ones, so use it with care.'}
          error={kinds.length === 0}
        >
          <ChipPicker items={KIND_ITEMS} selected={kinds} onchange={next => (kinds = next)} disabled={!isAdmin} placeholder="Add a kind..." label="What to remove" />
        </SettingRow>

        <SettingRow title="Time before deletion" hint={ttlError ?? `In seconds. ${ttlNumber >= 60 ? `That is ${formatDuration(ttlNumber)}.` : ''}`.trim()} error={!!ttlError}>
          <div class="sm:flex sm:flex-col sm:items-end">
            <Input bind:value={ttl} inputmode="numeric" maxlength={6} placeholder="600" oninput={restrictTo(onlyDigits, v => (ttl = v))} aria-label="Time before deletion in seconds" disabled={!isAdmin} class="w-full sm:w-32" />
            {#if !ttlError && ttlNumber >= 60}<p class="mt-1.5 text-xs font-medium text-zinc-300">{formatDuration(ttlNumber)}</p>{/if}
          </div>
        </SettingRow>

        <SettingRow title="Exclude moderators" hint="Messages from people with moderator permissions, or a moderator role of this server, are kept.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{excludeMods ? 'Excluded' : 'Included'}</span>
            <Toggle on={excludeMods} disabled={!isAdmin} label="Exclude moderators" onclick={() => (excludeMods = !excludeMods)} />
          </div>
        </SettingRow>

        <SettingRow title="Exclude admins" hint="Messages from people with admin permissions, an admin role of this server, or the server owner are kept.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{excludeAdmins ? 'Excluded' : 'Included'}</span>
            <Toggle on={excludeAdmins} disabled={!isAdmin} label="Exclude admins" onclick={() => (excludeAdmins = !excludeAdmins)} />
          </div>
        </SettingRow>

        <SettingRow title="Exclude pinned messages" hint="A pinned message is kept, even when it is pinned after it was sent.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{excludePinned ? 'Excluded' : 'Included'}</span>
            <Toggle on={excludePinned} disabled={!isAdmin} label="Exclude pinned messages" onclick={() => (excludePinned = !excludePinned)} />
          </div>
        </SettingRow>

        {#if isAdmin}
          <div class="flex justify-end pt-5">
            <SaveButton onclick={save} disabled={!dirty || !!ttlError || kinds.length === 0} {saving} />
          </div>
        {/if}
      {/if}
    </Card>
  {:else if loaded && total === 0 && !statusFilter}
    <EmptyState kind="log" title="No messages yet" description="Messages the autoremover picks up in the watched channel are listed here while they wait, and after they are deleted." />
  {:else}
    <Select
      bind:value={statusParam.value}
      onchange={refilter}
      placeholder="All statuses"
      label="Status"
      options={[
        { value: 'pending', label: 'Waiting' },
        { value: 'deleted', label: 'Deleted' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
      ]}
      class="w-48"
    />
    <Card flush>
      {#if !loaded}
        <TableSkeleton
            columns={['w-16', 'w-64', 'flex-1', 'w-44', 'w-40', 'w-52', 'w-24']}
            headings={['#', 'Author', 'Files', 'Channel', 'Status', 'When', '']}
            kinds={['bar', 'actor', 'bar', 'bar', 'pill', 'bar', 'action']}
            rows={5}
            rowHeight="h-14"
          />
      {:else if items.length === 0}
        <p class="px-5 py-8 text-center text-xs text-zinc-500">No message has this status.</p>
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
              <th class="{th} w-16">#</th>
              <th class="{th} w-64">Author</th>
              <th class={th}>Files</th>
              <th class="{th} w-44">Channel</th>
              <th class="{th} w-40">Status</th>
              <th class="{th} w-52">When</th>
              <th class="{th} w-24"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each items as item, i (item.id)}
              <tr class="hover:bg-zinc-800/30 transition-colors">
                <td class="{cell} text-zinc-500">{(page - 1) * limit + i + 1}</td>
                <td class={cell}>{#if item.author}<ActorCell actor={item.author} />{/if}</td>
                <td class="{cell} text-zinc-200"><span class="line-clamp-2 break-all">{item.summary}</span></td>
                <td class="{cell} whitespace-nowrap"><ChannelChip channel={channelOf(item.channel_id)} /></td>
                <td class={cell}>
                  <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                </td>
                <td class="{cell} whitespace-nowrap">
                  {#if item.status === 'pending'}
                    <p class="text-xs font-semibold text-sky-400">{timeLeft(item)}</p>
                    <p class="text-xs text-zinc-500">{when(item.delete_at)}</p>
                  {:else if item.processed_at}
                    <p class="text-xs text-zinc-400">{when(item.processed_at)}</p>
                  {/if}
                </td>
                <td class="{cell} text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" aria-label="Log of this message" title="Log" onclick={() => (logTarget = item)}>
                    <ScrollText class="w-3.5 h-3.5" />
                  </Button>
                  {#if item.status === 'pending'}
                    <Button variant="ghost" size="icon" aria-label="Cancel this deletion" title="Cancel this deletion" onclick={() => (cancelTarget = item)}>
                      <X class="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
      {/if}
    </Card>
  {/if}
</div>

<Modal show={!!logTarget} onClose={() => (logTarget = null)}>
  {#if logTarget}
    {@const item = logTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <ScrollText class="w-4 h-4 shrink-0 text-green-400" />Message log
    </h3>

    <div class="mt-5 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
        <a href={jump(item)} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors">
          Jump to message<ExternalLink class="w-3 h-3" />
        </a>
      </div>

      <div>
        <span class={label}>Author</span>
        {#if item.author}<ActorCell actor={item.author} />{/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class={label}>Channel</span>
          <ChannelChip channel={channelOf(item.channel_id)} />
        </div>
        <div>
          <span class={label}>Marked</span>
          <p class="text-sm text-zinc-200">{when(item.created_at)}</p>
        </div>
        <div>
          <span class={label}>{item.status === 'pending' ? 'Deletes' : 'Scheduled for'}</span>
          <p class="text-sm text-zinc-200">{when(item.delete_at)}</p>
        </div>
        {#if item.processed_at}
          <div>
            <span class={label}>Finished</span>
            <p class="text-sm text-zinc-200">{when(item.processed_at)}</p>
          </div>
        {/if}
      </div>

      <div>
        <span class={label}>Files</span>
        <p class="text-sm text-zinc-200 break-all">{item.summary}</p>
      </div>

      <div>
        <span class={label}>Result</span>
        <p class="text-sm leading-relaxed text-zinc-300">{outcome(item)}</p>
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      {#if item.status === 'pending'}
        <Button variant="danger" onclick={() => { cancelTarget = item; logTarget = null; }}>Cancel deletion</Button>
      {/if}
      <Button variant="secondary" onclick={() => (logTarget = null)}>Close</Button>
    </div>
  {/if}
</Modal>

<ConfirmModal
  show={!!cancelTarget}
  title="Cancel this deletion?"
  confirmLabel="Cancel deletion"
  busyLabel="Cancelling…"
  busy={cancelling}
  icon={X}
  onConfirm={cancel}
  onClose={() => (cancelTarget = null)}
>
  The message stays in the channel and is not deleted automatically. This cannot be undone: it will not be marked again.
</ConfirmModal>
