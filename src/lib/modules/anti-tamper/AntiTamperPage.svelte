<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import AvatarStack from '$lib/components/AvatarStack.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelChip from '$lib/components/ChannelChip.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import RoleChip from '$lib/components/RoleChip.svelte';
  import RoleExceptions from '$lib/components/RoleExceptions.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import { api, type AntiTamperLog, type AntiTamperRules, type ChannelPermissions, type DiscordChannel, type DiscordRole, type OverwriteDetail, type RoleExemption } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlNumber, urlParam } from '$lib/url-param';
  import { label, td, th } from '$lib/ui';
  import { Check, Eye, Hash, Info, ListChecks, Lock, Megaphone, Plus, Radar, RefreshCw, ScrollText, Settings, Shield, ShieldAlert, ShieldCheck, Trash2, TriangleAlert, UserCheck, X } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  // Four sections; inside Protection a switch picks what is protected (roles or channels).
  // Where the person is lives in the address: the section, what is protected, the open row and its panel, the logs page.
  const sectionParam = urlParam('tab', 'protection');
  const kindParam = urlParam('kind', 'roles');
  const openParam = urlParam('open');
  const panelParam = urlParam('panel', 'exceptions');
  const logPageParam = urlNumber('page');
  const section = $derived(sectionParam.value);
  const kind = $derived(kindParam.value);
  const view = $derived(section === 'protection' ? kind : section);
  let info = $state(false);
  let rules: AntiTamperRules | null = $state(null);
  let roles: DiscordRole[] = $state([]);
  let channels: DiscordChannel[] = $state([]);

  let pickedRole = $state('');
  let addingRole = $state(false);
  let pickedChannel = $state('');
  let addingChannel = $state(false);
  let addingException = $state(false);
  // The protected role or channel whose own exceptions are open under its row, and whether its add panel is open.
  const openRole = $derived(section === 'protection' && kind === 'roles' && openParam.value ? openParam.value : null);
  const openChannel = $derived(section === 'protection' && kind === 'channels' && openParam.value ? openParam.value : null);
  const channelPanel = $derived(panelParam.value === 'details' ? 'details' : 'exceptions');
  let addingLocal = $state(false);
  let reportChannel = $state('');
  let savedChannel = '';

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const roleOf = (id: string) => roles.find(r => r.id === id);
  const channelOf = (id: string) => channels.find(c => c.id === id);
  const takenRoles = $derived.by(() => ((rules as AntiTamperRules | null)?.roles ?? []).map(r => r.role_id));
  const takenChannels = $derived.by(() => ((rules as AntiTamperRules | null)?.channels ?? []).map(c => c.channel_id));
  // The Exceptions column only exists once something protected has exceptions of its own.
  const hasLocalRoles = $derived.by(() => ((rules as AntiTamperRules | null)?.roles ?? []).some(r => r.exceptions.length > 0));
  const hasLocalChannels = $derived.by(() => ((rules as AntiTamperRules | null)?.channels ?? []).some(c => c.exceptions.length > 0));

  const stackOf = (exceptions: RoleExemption[]) =>
    exceptions
      .map(e =>
        e.target_type === 'user'
          ? { kind: 'user' as const, name: e.user?.name ?? e.target_id, avatarUrl: e.user?.avatar_url ?? null }
          : { kind: 'role' as const, name: roleOf(e.target_id)?.name ?? 'Deleted role', color: roleOf(e.target_id)?.color },
      )
      // Users first, then roles, so a mixed stack reads as two groups.
      .sort((a, b) => Number(a.kind === 'role') - Number(b.kind === 'role'));
  const summaryOf = (exceptions: RoleExemption[]) => {
    const users = exceptions.filter(e => e.target_type === 'user').length;
    const roleCount = exceptions.length - users;
    const noun = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    if (!roleCount) return noun(users, 'user', 'users');
    if (!users) return noun(roleCount, 'role', 'roles');
    return `${noun(users, 'user', 'users')}, ${noun(roleCount, 'role', 'roles')}`;
  };

  // The hint follows the tab: each one explains what is in front of the person, not the whole module.
  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    logs: {
      title: 'What the logs show',
      steps: [
        { text: 'Every time the bot catches someone holding a protected role or changing a protected channel, it is listed here, newest first.' },
        { text: 'Put back: the role was taken back, or the permissions were restored. Failed: the bot tried and could not, usually a missing permission, and the reason says which. Unverified: a channel changed but the audit log did not say who, so nothing was changed.' },
        { text: 'Setting changes (adding a role, an exception) are in the audit log, not here.' },
      ],
    },
    settings: {
      title: 'How reports work',
      steps: [
        { text: 'The report channel gets a message for each detection: who held the role or changed the channel, who gave the role, and what the bot did.' },
        { text: 'Without one, nothing is posted. Detections are still listed in the Logs tab and the audit log.' },
      ],
    },
  };
  const hint = $derived(HINTS[view] ?? HINTS.logs);
  // Info is for views with nothing to add: where there is an Add button, the dashboard already shows what to do.
  const hasInfo = $derived(view in HINTS);

  function apply(next: AntiTamperRules) {
    rules = next;
    savedChannel = reportChannel = next.report_channel_id ?? '';
  }

  /** Runs a change and shows what the server answers; on failure the page keeps what it had. */
  async function change(action: () => Promise<AntiTamperRules>, success?: string): Promise<boolean> {
    try {
      apply(await action());
      if (success) toast('success', success);
      return true;
    } catch (e: any) {
      reportChannel = savedChannel;
      toast('error', e.message);
      return false;
    }
  }

  const addRole = async () => {
    const roleId = pickedRole;
    pickedRole = '';
    if (await change(() => api.antiTamper.addRole(guildId, roleId), 'Role protected')) addingRole = false;
  };
  const addChannel = async () => {
    const channelId = pickedChannel;
    pickedChannel = '';
    if (await change(() => api.antiTamper.addChannel(guildId, channelId), 'Channel protected')) addingChannel = false;
  };

  // Removing a protection, and locking a channel's permissions again, ask first.
  let removeTarget: string | null = $state(null);
  let removeChannelTarget: string | null = $state(null);
  let lockTarget: string | null = $state(null);
  let busy = $state(false);
  // The open details were read before the change: read them again so they show what is protected and current now.
  async function syncChannel() {
    const id = lockTarget!;
    const done = await change(() => api.antiTamper.lockChannel(guildId, id), 'Rules updated');
    if (done && openChannel === id && channelPanel === 'details') await loadDetails(id);
    return done;
  }
  let restoreTarget: string | null = $state(null);
  async function restoreNow() {
    const id = restoreTarget!;
    const done = await change(() => api.antiTamper.restoreChannel(guildId, id), 'Permissions synced');
    if (done && openChannel === id && channelPanel === 'details') await loadDetails(id);
    return done;
  }
  async function confirmed(action: () => Promise<boolean>, close: () => void) {
    busy = true;
    if (await action()) close();
    busy = false;
  }
  const saveChannel = () =>
    change(() => api.antiTamper.setReportChannel(guildId, reportChannel || null), reportChannel ? 'Report channel saved' : 'Reporting stopped');

  // The switches: one per protected role or channel, and one per kind for the whole server (Settings).
  let switching = $state(false);
  async function flip(action: () => Promise<AntiTamperRules>, success: string) {
    if (switching) return;
    switching = true;
    await change(action, success);
    switching = false;
  }
  const rolesOff = $derived.by(() => {
    const current: AntiTamperRules | null = rules;
    return !!current && !current.roles_enabled;
  });
  const channelsOff = $derived.by(() => {
    const current: AntiTamperRules | null = rules;
    return !!current && !current.channels_enabled;
  });

  // The details of a protected channel: the permissions kept for it, and (when someone changed them) the ones it has now.
  let details: ChannelPermissions | null = $state(null);
  let detailsLoading = $state(false);
  function openDetails(channelId: string) {
    const close = openChannel === channelId && channelPanel === 'details';
    openParam.value = close ? '' : channelId;
    panelParam.value = 'details';
  }
  async function loadDetails(channelId: string) {
    details = null;
    detailsLoading = true;
    try {
      details = await api.antiTamper.channelPermissions(guildId, channelId);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      detailsLoading = false;
    }
  }
  // The details are read whenever a channel's details panel is the open one, a link included.
  $effect(() => {
    const id = openChannel;
    if (id && channelPanel === 'details') untrack(() => void loadDetails(id));
  });
  // Which role or member's permissions are open on the right; the first one until another is picked.
  let pickedOverwrite = $state('');
  const stateOf = (overwrite: OverwriteDetail | undefined, name: string): 'allow' | 'deny' | 'none' =>
    overwrite?.allow.includes(name) ? 'allow' : overwrite?.deny.includes(name) ? 'deny' : 'none';
  // Everyone with an override, protected or now; when the channel is not in sync, the ones whose permissions differ are marked.
  const targets = $derived.by(() => {
    const current: ChannelPermissions | null = details;
    if (!current) return [];
    const ids = [...new Set([...current.saved.map(o => o.id), ...current.current.map(o => o.id)])];
    return ids.map(id => {
      const saved = current.saved.find(o => o.id === id);
      const now = current.current.find(o => o.id === id);
      const names = new Set([...(saved?.allow ?? []), ...(saved?.deny ?? []), ...(now?.allow ?? []), ...(now?.deny ?? [])]);
      const rows = [...names]
        .sort((x, y) => x.localeCompare(y))
        .map(name => ({ name, saved: stateOf(saved, name), now: stateOf(now, name) }));
      return { overwrite: (saved ?? now)!, rows, differs: rows.some(r => r.saved !== r.now) };
    });
  });
  const selectedTarget = $derived(targets.find(t => t.overwrite.id === pickedOverwrite) ?? targets[0] ?? null);

  const channelActions = (channelId: string): RowMenuItem[] => [
    { label: 'Protections', icon: ShieldCheck, onclick: () => openDetails(channelId) },
    {
      label: 'Exceptions',
      icon: UserCheck,
      onclick: () => {
        const close = openChannel === channelId && channelPanel === 'exceptions';
        openParam.value = close ? '' : channelId;
        panelParam.value = 'exceptions';
        addingLocal = false;
      },
    },
    ...(isAdmin
      ? [
          { label: 'Stop protecting', icon: Trash2, danger: true, onclick: () => (removeChannelTarget = channelId) },
        ]
      : []),
  ];

  // The logs: loaded the first time the tab is opened.
  let logs: AntiTamperLog[] = $state([]);
  const logPage = $derived(logPageParam.value);
  let logLimit = $state(10);
  let logTotal = $state(0);
  let logsLoaded = $state(false);
  let logsLoading = $state(false);
  async function loadLogs() {
    logsLoading = true;
    try {
      const res = await api.antiTamper.logs(guildId, { page: logPage, limit: logLimit });
      logs = res.logs;
      logTotal = res.pagination.total;
      logsLoaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      logsLoading = false;
    }
  }
  $effect(() => {
    if (view === 'logs') {
      void logPage;
      untrack(() => void loadLogs());
    }
  });
  const RESULT = { reverted: ['success', 'Put back'], failed: ['danger', 'Failed'], unverified: ['warning', 'Unverified'] } as const;

  onMount(async () => {
    const [loaded, roleList, channelList] = await Promise.allSettled([api.antiTamper.rules(guildId), api.roles(guildId), api.channels(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (loaded.status === 'fulfilled') apply(loaded.value);
    else toast('error', loaded.reason?.message ?? 'Could not load the anti tamper rules');
  });
</script>

<!-- A column of exceptions: one shown in full, several as a stack of avatars with a count. -->
{#snippet exceptionsCell(list: RoleExemption[])}
  {#if list.length === 1}
    {@const only = list[0]}
    {#if only.target_type === 'user' && only.user}
      <ActorCell actor={only.user} />
    {:else if only.target_type === 'role'}
      <RoleChip role={roleOf(only.target_id)} missing="Deleted role" />
    {:else}
      <span class="font-mono text-xs text-zinc-400">{only.target_id}</span>
    {/if}
  {:else if list.length > 1}
    <div class="flex items-center gap-3">
      <AvatarStack items={stackOf(list)} />
      <span class="text-xs text-zinc-400">{summaryOf(list)}</span>
    </div>
  {/if}
{/snippet}

<!-- The exceptions of one protected role or channel, opened under its row. -->
{#snippet accordion(title: string, exceptions: RoleExemption[], rowHint: string, add: (target: Pick<RoleExemption, 'target_type' | 'target_id'>) => Promise<boolean>, remove: (target: RoleExemption) => Promise<unknown>)}
  <div class="border-t border-zinc-800/40 bg-zinc-800/10 p-5" transition:slide={{ duration: 220, easing: cubicOut }}>
    <div class="mb-4 flex items-center justify-between gap-3">
      <SectionTitle icon={UserCheck} {title} />
      {#if isAdmin}
        <Button variant="secondary" onclick={() => (addingLocal = !addingLocal)}><Plus class="w-3.5 h-3.5" />Add exception</Button>
      {/if}
    </div>
    <RoleExceptions {exceptions} {roles} canEdit={isAdmin} bind:adding={addingLocal} compact hint={rowHint} onAdd={add} onRemove={remove} />
  </div>
{/snippet}

<!-- The protected permissions of one channel, opened under its row. -->
{#snippet detailsPanel(channelId: string)}
  <div class="border-t border-zinc-800/40 bg-zinc-800/10 p-5" transition:slide={{ duration: 220, easing: cubicOut }}>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <SectionTitle icon={ShieldCheck} title="Protected permissions" />
      {#if details?.same}
        <span class="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/25"><Check class="h-3.5 w-3.5" />In sync</span>
      {/if}
      {#if details && !details.same && isAdmin}
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" onclick={() => (lockTarget = channelId)}><ListChecks class="h-3.5 w-3.5" />Update rules</Button>
          <Button variant="primary" size="sm" onclick={() => (restoreTarget = channelId)}><RefreshCw class="h-3.5 w-3.5" />Sync</Button>
        </div>
      {/if}
    </div>

    {#if details && !details.same}
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-500/10 px-4 py-3 ring-1 ring-orange-500/25">
        <div class="flex min-w-0 items-start gap-2.5">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-orange-400">Changed since it was protected</p>
            <p class="mt-0.5 text-xs text-zinc-400">Red rows are different now.</p>
            <p class="mt-0.5 text-xs text-zinc-500"><span class="text-zinc-400">Sync</span> puts the protected permissions back. <span class="text-zinc-400">Update rules</span> makes the current ones the protected ones.</p>
          </div>
        </div>
      </div>
    {/if}

    {#if detailsLoading}
      <div class="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]" aria-hidden="true">
        <div class="space-y-2">{#each [0, 1, 2] as n (n)}<div class="h-10 animate-pulse rounded-lg bg-zinc-800/40"></div>{/each}</div>
        <div class="h-40 animate-pulse rounded-xl bg-zinc-800/40"></div>
      </div>
    {:else if targets.length === 0}
      <p class="py-2 text-xs text-zinc-500">No permission overrides: the channel uses what its category and the server give.</p>
    {:else}
      <!-- The roles and members that have overrides; the one picked shows its permissions. -->
      <div class="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ul class="space-y-1" aria-label="Roles and members with overrides">
          {#each targets as target (target.overwrite.id)}
            {@const overwrite = target.overwrite}
            <li>
              <button
                type="button"
                onclick={() => (pickedOverwrite = overwrite.id)}
                class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/50 {selectedTarget?.overwrite.id === overwrite.id ? 'bg-zinc-700/50' : 'hover:bg-zinc-800/60'}"
              >
                <span class="min-w-0">
                  {#if overwrite.type === 'member' && overwrite.user}
                    <span class="block truncate text-xs font-medium text-zinc-200">{overwrite.user.name ?? overwrite.id}</span>
                  {:else if overwrite.type === 'member'}
                    <span class="block truncate font-mono text-xs text-zinc-400">{overwrite.id}</span>
                  {:else}
                    <RoleChip role={roleOf(overwrite.id) ?? { id: overwrite.id, name: overwrite.name ?? 'Role', color: overwrite.color ?? '#000000', problem: null, access: 'everyone' }} />
                  {/if}
                </span>
                {#if target.differs}<span class="h-2 w-2 shrink-0 rounded-full bg-red-400" title="Different from the protected permissions"></span>{/if}
              </button>
            </li>
          {/each}
        </ul>

        {#if selectedTarget}
          <Card flush>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                  <th class="{th} h-9">Permission</th>
                  <th class="{th.replace('text-left', 'text-center')} h-9 w-28">Protected</th>
                  <th class="{th.replace('text-left', 'text-center')} h-9 w-28">Current</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/30">
                {#each selectedTarget.rows as row (row.name)}
                  {@const differs = row.saved !== row.now}
                  <tr class={differs ? 'bg-red-500/[0.07]' : ''}>
                    <td class="px-5 py-2 text-xs {differs ? 'text-red-300' : 'text-zinc-200'}">
                      {row.name}
                      <span class="ml-1.5 text-zinc-500">{row.saved === 'allow' ? 'Allowed' : row.saved === 'deny' ? 'Denied' : 'Not set'}</span>
                    </td>
                    <td class="px-5 py-2 text-center"><Check class="mx-auto h-4 w-4 text-emerald-400" aria-label="Protected" /></td>
                    <td class="px-5 py-2 text-center">
                      {#if row.now === 'allow'}<Check class="mx-auto h-4 w-4 {differs ? 'text-red-400' : 'text-emerald-400'}" aria-label="Allowed currently" />
                      {:else if row.now === 'deny'}<X class="mx-auto h-4 w-4 {differs ? 'text-red-400' : 'text-zinc-400'}" aria-label="Denied currently" />{/if}
                    </td>
                  </tr>
                {:else}
                  <tr><td colspan="3" class="px-5 py-4 text-xs text-zinc-500">No permission is set for this one.</td></tr>
                {/each}
              </tbody>
            </table>
          </Card>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<PageHeader module="anti-tamper" description="Roles and channel permissions only chosen people can hold or change" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={sectionParam.value}
      tabs={[
        { id: 'protection', label: 'Protection', icon: ShieldAlert, count: rules ? rules.roles.length + rules.channels.length : null },
        { id: 'exceptions', label: 'Global exceptions', icon: UserCheck, count: rules ? rules.exceptions.length : null },
        { id: 'logs', label: 'Logs', icon: ScrollText },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    <div class="flex items-center gap-2">
      {#if hasInfo}
        <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
      {/if}
      {#if isAdmin && view === 'exceptions'}
        <Button variant="primary" onclick={() => (addingException = !addingException)}><Plus class="w-3.5 h-3.5" />Add exception</Button>
      {/if}
    </div>
  </div>

  <InfoPanel show={info && hasInfo} title={hint.title} tone="red" steps={hint.steps} />

  {#if rules}<WarningBanner warnings={rules.warnings} />{/if}

  {#if section === 'protection'}
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <SegmentedControl
        bind:value={kindParam.value}
        label="What is protected"
        options={[
          { id: 'roles', label: 'Roles', icon: ShieldAlert, count: rules ? rules.roles.length : null },
          { id: 'channels', label: 'Channels', icon: Hash, count: rules ? rules.channels.length : null },
        ]}
      />
      {#if isAdmin}
        <Button variant="primary" onclick={() => (kind === 'roles' ? (addingRole = !addingRole) : (addingChannel = !addingChannel))}>
          <Plus class="w-3.5 h-3.5" />{kind === 'roles' ? 'Protect role' : 'Protect channel'}
        </Button>
      {/if}
    </div>
  {/if}

  {#if view === 'roles' && rolesOff}
    <p class="rounded-xl bg-zinc-800 px-4 py-3 text-xs text-zinc-300">Protection of roles is off for the whole server, so nothing below is enforced. Turn it on in Settings.</p>
  {:else if view === 'channels' && channelsOff}
    <p class="rounded-xl bg-zinc-800 px-4 py-3 text-xs text-zinc-300">Protection of channels is off for the whole server, so nothing below is enforced. Turn it on in Settings.</p>
  {/if}

  {#if view === 'settings'}
    <Card>
      <SectionTitle icon={ShieldAlert} title="Protection" class="mb-5" />
      <div class="space-y-4">
        {#each [{ kind: 'roles' as const, title: 'Protect roles', text: 'Take protected roles back from anyone who is not an exception.', on: rules?.roles_enabled }, { kind: 'channels' as const, title: 'Protect channels', text: 'Put the permissions of protected channels back when someone who is not an exception changes them.', on: rules?.channels_enabled }] as item (item.kind)}
          <div class="flex items-center justify-between gap-6">
            <div class="min-w-0">
              <p class="text-sm font-medium text-zinc-200">{item.title}</p>
              <p class="mt-0.5 text-xs text-zinc-500">{item.text}</p>
            </div>
            {#if rules}
              <Toggle
                on={!!item.on}
                disabled={!isAdmin || switching}
                label={item.title}
                onclick={() => flip(() => api.antiTamper.setProtection(guildId, item.kind, !item.on), item.on ? `${item.title} is off` : `${item.title} is on`)}
              />
            {:else}
              <div class="h-5 w-9 shrink-0 rounded-full bg-zinc-800/40 animate-pulse" aria-hidden="true"></div>
            {/if}
          </div>
        {/each}
      </div>
    </Card>
    <Card>
      <SectionTitle icon={Megaphone} title="Report channel" class="mb-5" />
      <span class={label}>Channel</span>
      <p class="mb-2.5 text-xs text-zinc-500">Where the bot says who got a protected role, who changed a protected channel, and what it did. Pick Not reported to stay silent; the Logs tab and the audit log still record everything.</p>
      {#if rules}
        <ChannelPicker {channels} bind:value={reportChannel} onchange={saveChannel} none="Not reported" label="Report channel" disabled={!isAdmin} class="w-full sm:w-80" />
      {:else}
        <div class="h-9 w-full sm:w-80 rounded-lg bg-zinc-800/40 animate-pulse" aria-hidden="true"></div>
      {/if}
    </Card>
    <Card>
      <SectionTitle icon={Radar} title="Sweep" class="mb-5" />
      <p class="mb-4 text-xs text-zinc-500">
        Sweep is locked for now. Discord cannot list the members of a role, so a sweep would have to load every member of the server first. Roles are still enforced as members change.
      </p>
      <Button variant="secondary" disabled title="Locked for now"><Lock class="w-3.5 h-3.5" />Sweep now</Button>
    </Card>
  {:else if view === 'logs'}
    {#if logsLoaded && logTotal === 0}
      <EmptyState kind="log" title="Nothing detected yet" description="When someone holds a protected role or changes a protected channel, it is listed here." />
    {:else}
      <Card flush>
        {#if !logsLoaded}
          <TableSkeleton
            columns={['w-16', 'w-44', 'w-28', 'w-56', 'w-64', 'w-32', 'flex-1']}
            headings={['#', 'When', 'Type', 'Target', 'Who', 'Result', 'Reason']}
            kinds={['bar', 'bar', 'pill', 'bar', 'actor', 'pill', 'bar']}
            rows={5}
            rowHeight="h-16"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class="{th} w-44">When</th>
                <th class="{th} w-28">Type</th>
                <th class="{th} w-56">Target</th>
                <th class="{th} w-64">Who</th>
                <th class="{th} w-32">Result</th>
                <th class={th}>Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each logs as log, i (log.id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} h-16 text-zinc-500">{(logPage - 1) * logLimit + i + 1}</td>
                  <td class="{cell} h-16 text-zinc-500 whitespace-nowrap">{when(log.created_at)}</td>
                  <td class="{cell} h-16"><Badge tone={log.kind === 'role' ? 'accent' : 'info'}>{log.kind === 'role' ? 'Role' : 'Channel'}</Badge></td>
                  <td class="{cell} h-16">
                    {#if log.kind === 'channel' && log.channel_id}
                      <ChannelChip channel={channelOf(log.channel_id)} />
                    {:else}
                      <div class="flex flex-wrap gap-1">{#each log.role_ids as id (id)}<RoleChip role={roleOf(id)} missing="Deleted role" />{/each}</div>
                    {/if}
                  </td>
                  <td class="{cell} h-16">
                    {#if log.kind === 'role' ? log.member : log.by}<ActorCell actor={(log.kind === 'role' ? log.member : log.by)!} />{:else}<span class="text-zinc-600">-</span>{/if}
                  </td>
                  <td class="{cell} h-16"><Badge tone={RESULT[log.result][0]}>{RESULT[log.result][1]}</Badge></td>
                  <td class="{cell} h-16 text-zinc-400">
                    <p class="line-clamp-2 leading-relaxed" title={log.reason ?? undefined}>{log.reason ?? ''}</p>
                    {#if log.kind === 'role' && log.by}<p class="truncate text-zinc-500">Given by {log.by.name ?? log.by.id}</p>{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <Pagination
            page={logPage}
            limit={logLimit}
            total={logTotal}
            onPage={p => (logPageParam.value = p)}
            onLimit={l => ((logLimit = l), (logPageParam.value = 1), loadLogs())}
            disabled={logsLoading}
          />
        {/if}
      </Card>
    {/if}
  {:else if view === 'exceptions'}
    {#if rules}
      <RoleExceptions
        exceptions={rules.exceptions}
        {roles}
        canEdit={isAdmin}
        scoped
        bind:adding={addingException}
        hint="Global: left alone by protection, for protected roles, protected channels, or both. For just one role or one channel, use the exceptions under its row instead. Nobody is exempt on their own: not the server owner, not moderators or admins, not other bots, so list everyone who should be."
        onAdd={async target => change(() => api.antiTamper.addException(guildId, target), 'Exception added')}
        onRemove={async target => change(() => api.antiTamper.removeException(guildId, target), 'Exception removed')}
      />
    {:else}
      <Card flush>
        <TableSkeleton
          columns={['w-16', 'flex-1', 'w-36', 'w-52', ...(isAdmin ? ['w-16'] : [])]}
          headings={['#', 'Who', 'Type', 'Applies to', ...(isAdmin ? [''] : [])]}
          kinds={['bar', 'bar', 'pill', 'pill', ...(isAdmin ? ['action' as const] : [])]}
          rows={4}
          rowHeight="h-14"
        />
      </Card>
    {/if}
  {:else if view === 'channels'}
    {#if isAdmin && addingChannel}
      <div transition:slide={{ duration: 220, easing: cubicOut }}>
        <Card>
          <SectionTitle icon={Plus} title="Protect a channel" class="mb-1" />
          <p class="mb-4 text-xs text-zinc-500">The permissions the channel has right now are saved. When someone who is not an exception changes them, they are put back.</p>
          <div class="flex flex-col sm:flex-row sm:items-end gap-3">
            <div class="w-full sm:w-80">
              <span class={label}>Channel</span>
              {#if rules}
                <ChannelPicker all manageable channels={channels.filter(c => !takenChannels.includes(c.id))} bind:value={pickedChannel} none="Pick a channel" label="Channel to protect" class="w-full" />
              {:else}
                <ControlSkeleton class="w-full" />
              {/if}
            </div>
            <Button variant="primary" onclick={addChannel} disabled={!pickedChannel}><Plus class="w-3.5 h-3.5" />Protect</Button>
            <Button variant="ghost" onclick={() => (addingChannel = false)}>Cancel</Button>
          </div>
        </Card>
      </div>
    {/if}

    {#if rules && rules.channels.length === 0}
      <EmptyState kind="modules" title="No protected channels" description="Protect a channel so its permissions are put back when someone who is not an exception changes them." />
    {:else}
      <Card flush>
        {#if !rules}
          <TableSkeleton columns={['w-16', 'flex-1', 'w-40', 'w-32', 'w-16']} headings={['#', 'Channel', 'Permissions', 'Protection', '']} kinds={['bar', 'bar', 'bar', 'toggle', 'action']} rows={4} rowHeight="h-14" />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Channel</th>
                <th class="{th} w-40" title="How many permission overrides are kept">Permissions</th>
                {#if hasLocalChannels}<th class="{th} w-72" title="Who may change only this channel, on top of the global exceptions">Exceptions</th>{/if}
                <th class="{th} w-32" title="Pause the protection of just this channel">Protection</th>
                <th class="{th} w-16"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each rules.channels as rule, i (rule.channel_id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{i + 1}</td>
                  <td class="{cell} {rule.enabled && !channelsOff ? '' : 'opacity-50'}">
                    <ChannelChip channel={channelOf(rule.channel_id)} />
                    {#if rule.problem}
                      <p class="mt-0.5 flex items-center gap-1 text-xs text-amber-400"><TriangleAlert class="w-3 h-3 shrink-0" />{rule.problem}</p>
                    {/if}
                  </td>
                  <td class="{cell} text-xs text-zinc-400 {rule.enabled && !channelsOff ? '' : 'opacity-50'}">{rule.overwrites} {rule.overwrites === 1 ? 'override' : 'overrides'}</td>
                  {#if hasLocalChannels}<td class="{cell} {rule.enabled && !channelsOff ? '' : 'opacity-50'}">{@render exceptionsCell(rule.exceptions)}</td>{/if}
                  <td class={cell}>
                    <Toggle
                      on={rule.enabled}
                      disabled={!isAdmin || switching}
                      label="{rule.enabled ? 'Pause' : 'Resume'} the protection of {channelOf(rule.channel_id)?.name ?? 'this channel'}"
                      onclick={() => flip(() => api.antiTamper.setChannelEnabled(guildId, rule.channel_id, !rule.enabled), rule.enabled ? 'Protection paused' : 'Protection on, permissions saved as they are now')}
                    />
                  </td>
                  <td class="{cell} text-right"><RowMenu label="Actions for this channel" items={channelActions(rule.channel_id)} /></td>
                </tr>
                {#if openChannel === rule.channel_id}
                  <tr>
                    <td colspan={hasLocalChannels ? 6 : 5} class="p-0">
                      {#if channelPanel === 'details'}
                        {@render detailsPanel(rule.channel_id)}
                      {:else}
                      {@render accordion(
                        'Exceptions for this channel',
                        rule.exceptions,
                        'Only for this channel: the people and roles listed here may change its permissions, on top of the global exceptions. Anyone else has their change undone.',
                        async target => change(() => api.antiTamper.addChannelException(guildId, rule.channel_id, target), 'Exception added'),
                        async target => change(() => api.antiTamper.removeChannelException(guildId, rule.channel_id, target), 'Exception removed'),
                      )}
                      {/if}
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        {/if}
      </Card>
    {/if}
  {:else}
    {#if isAdmin && addingRole}
      <div transition:slide={{ duration: 220, easing: cubicOut }}>
        <Card>
          <SectionTitle icon={Plus} title="Protect a role" class="mb-1" />
          <p class="mb-4 text-xs text-zinc-500">Anyone who ends up with a protected role and is not an exception loses it again.</p>
          <div class="flex flex-col sm:flex-row sm:items-end gap-3">
            <div class="w-full sm:w-80">
              <span class={label}>Role</span>
              {#if rules}
                <RoleSelect {roles} manageable exclude={takenRoles} bind:value={pickedRole} class="w-full" />
              {:else}
                <ControlSkeleton class="w-full" />
              {/if}
            </div>
            <Button variant="primary" onclick={addRole} disabled={!pickedRole}><Plus class="w-3.5 h-3.5" />Protect</Button>
            <Button variant="ghost" onclick={() => (addingRole = false)}>Cancel</Button>
          </div>
        </Card>
      </div>
    {/if}

    {#if rules && rules.roles.length === 0}
      <EmptyState kind="modules" title="No protected roles" description="Protect a role so only the exceptions can hold it." />
    {:else}
      <Card flush>
        {#if !rules}
          <TableSkeleton
            columns={['w-16', 'flex-1', 'w-32', isAdmin ? 'w-24' : 'w-16']}
            headings={['#', 'Role', 'Protection', '']}
            kinds={['bar', 'bar', 'toggle', isAdmin ? 'actions' : 'action']}
            rows={4}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Role</th>
                {#if hasLocalRoles}<th class="{th} w-72" title="Who may hold only this role, on top of the global exceptions">Exceptions</th>{/if}
                <th class="{th} w-32" title="Pause the protection of just this role">Protection</th>
                <th class="{th} {isAdmin ? 'w-24' : 'w-16'}"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each rules.roles as rule, i (rule.role_id)}
                {@const role = roleOf(rule.role_id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{i + 1}</td>
                  <td class="{cell} {rule.enabled && !rolesOff ? '' : 'opacity-50'}">
                    <RoleChip {role} />
                    {#if rule.problem}
                      <p class="mt-0.5 flex items-center gap-1 text-xs text-amber-400"><TriangleAlert class="w-3 h-3 shrink-0" />{rule.problem}</p>
                    {/if}
                  </td>
                  {#if hasLocalRoles}<td class="{cell} {rule.enabled && !rolesOff ? '' : 'opacity-50'}">{@render exceptionsCell(rule.exceptions)}</td>{/if}
                  <td class={cell}>
                    <Toggle
                      on={rule.enabled}
                      disabled={!isAdmin || switching}
                      label="{rule.enabled ? 'Pause' : 'Resume'} the protection of {roleOf(rule.role_id)?.name ?? 'this role'}"
                      onclick={() => flip(() => api.antiTamper.setRoleEnabled(guildId, rule.role_id, !rule.enabled), rule.enabled ? 'Protection paused' : 'Protection on')}
                    />
                  </td>
                  <td class="{cell} text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Exceptions for this role"
                      title="Exceptions for this role"
                      onclick={() => ((openParam.value = openRole === rule.role_id ? '' : rule.role_id), (addingLocal = false))}
                    >
                      <UserCheck class="w-3.5 h-3.5" />
                    </Button>
                    {#if isAdmin}
                      <Button variant="ghost" size="icon" aria-label="Stop protecting this role" onclick={() => (removeTarget = rule.role_id)}>
                        <Trash2 class="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    {/if}
                  </td>
                </tr>
                {#if openRole === rule.role_id}
                  <tr>
                    <td colspan={hasLocalRoles ? 5 : 4} class="p-0">
                      {@render accordion(
                        'Exceptions for this role',
                        rule.exceptions,
                        'Only for this role: the people and roles listed here may hold it, on top of the global exceptions. Anyone else who ends up with it loses it again.',
                        async target => change(() => api.antiTamper.addRoleException(guildId, rule.role_id, target), 'Exception added'),
                        async target => change(() => api.antiTamper.removeRoleException(guildId, rule.role_id, target), 'Exception removed'),
                      )}
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        {/if}
      </Card>
    {/if}
  {/if}
</div>

<ConfirmModal
  show={!!removeTarget}
  title="Stop protecting this role?"
  confirmLabel="Stop protecting"
  busyLabel="Removing…"
  {busy}
  icon={Trash2}
  onConfirm={() => confirmed(() => change(() => api.antiTamper.removeRole(guildId, removeTarget!), 'Role is no longer protected'), () => (removeTarget = null))}
  onClose={() => (removeTarget = null)}
>
  {#if removeTarget}
    <span class="text-zinc-200">{roleOf(removeTarget)?.name ?? 'This role'}</span> can then be held by anyone again. People who hold it now keep it.
  {/if}
</ConfirmModal>

<ConfirmModal
  show={!!removeChannelTarget}
  title="Stop protecting this channel?"
  confirmLabel="Stop protecting"
  busyLabel="Removing…"
  {busy}
  icon={Trash2}
  onConfirm={() => confirmed(() => change(() => api.antiTamper.removeChannel(guildId, removeChannelTarget!), 'Channel is no longer protected'), () => (removeChannelTarget = null))}
  onClose={() => (removeChannelTarget = null)}
>
  {#if removeChannelTarget}
    Changes to the permissions of <span class="text-zinc-200">#{channelOf(removeChannelTarget)?.name ?? 'this channel'}</span> are no longer undone, and its saved permissions and exceptions are deleted.
  {/if}
</ConfirmModal>

<ConfirmModal
  show={!!restoreTarget}
  title="Sync the permissions?"
  confirmLabel="Sync"
  busyLabel="Syncing…"
  {busy}
  tone="primary"
  icon={RefreshCw}
  onConfirm={() => confirmed(restoreNow, () => (restoreTarget = null))}
  onClose={() => (restoreTarget = null)}
>
  {#if restoreTarget}
    The protected permissions are put back on <span class="text-zinc-200">#{channelOf(restoreTarget)?.name ?? 'this channel'}</span>, replacing what it has now.
  {/if}
</ConfirmModal>

<ConfirmModal
  show={!!lockTarget}
  title="Update the rules?"
  confirmLabel="Update rules"
  busyLabel="Saving…"
  {busy}
  tone="primary"
  icon={RefreshCw}
  onConfirm={() => confirmed(syncChannel, () => (lockTarget = null))}
  onClose={() => (lockTarget = null)}
>
  {#if lockTarget}
    The permissions <span class="text-zinc-200">#{channelOf(lockTarget)?.name ?? 'this channel'}</span> has right now replace the protected ones. From now on these are the ones the bot puts back.
  {/if}
</ConfirmModal>
