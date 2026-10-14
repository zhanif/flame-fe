<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import ActorCell from '$lib/components/ActorCell.svelte';
  import AvatarStack from '$lib/components/AvatarStack.svelte';
  import RoleChip from '$lib/components/RoleChip.svelte';
  import RoleExceptions from '$lib/components/RoleExceptions.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import { api, type AntiTamperRules, type DiscordChannel, type DiscordRole } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { label, td, th } from '$lib/ui';
  import { Lock, Megaphone, Plus, Radar, Settings, ShieldAlert, TriangleAlert, Trash2, UserCheck } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let tab = $state('roles');
  let rules: AntiTamperRules | null = $state(null);
  let roles: DiscordRole[] = $state([]);
  let channels: DiscordChannel[] = $state([]);

  let pickedRole = $state('');
  let addingRole = $state(false);
  let addingException = $state(false);
  // The protected role whose own exceptions are open under its row, and whether its add panel is open.
  let openRole: string | null = $state(null);
  let addingLocal = $state(false);
  let reportChannel = $state('');
  let savedChannel = '';

  const cell = td.replace('h-11', 'h-14');

  // The Details column only exists once some protected role has exceptions of its own.
  const hasLocal = $derived.by(() => ((rules as AntiTamperRules | null)?.roles ?? []).some(r => r.exceptions.length > 0));
  type LocalException = AntiTamperRules['roles'][number]['exceptions'][number];
  const stackOf = (exceptions: LocalException[]) =>
    exceptions.map(e =>
      e.target_type === 'user'
        ? { kind: 'user' as const, name: e.user?.name ?? e.target_id, avatarUrl: e.user?.avatar_url ?? null }
        : { kind: 'role' as const, name: roleOf(e.target_id)?.name ?? 'Deleted role', color: roleOf(e.target_id)?.color },
    )
    // Users first, then roles, so a mixed stack reads as two groups.
    .sort((a, b) => Number(a.kind === 'role') - Number(b.kind === 'role'));
  const summaryOf = (exceptions: LocalException[]) => {
    const users = exceptions.filter(e => e.target_type === 'user').length;
    const roleCount = exceptions.length - users;
    const noun = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    if (!roleCount) return noun(users, 'user', 'users');
    if (!users) return noun(roleCount, 'role', 'roles');
    return `${noun(users, 'user', 'users')}, ${noun(roleCount, 'role', 'roles')}`;
  };
  const roleOf = (id: string) => roles.find(r => r.id === id);
  const takenRoles = $derived.by(() => ((rules as AntiTamperRules | null)?.roles ?? []).map(r => r.role_id));

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
  let removeTarget: string | null = $state(null);
  let removing = $state(false);
  async function confirmRemove() {
    if (!removeTarget) return;
    removing = true;
    if (await change(() => api.antiTamper.removeRole(guildId, removeTarget!), 'Role is no longer protected')) removeTarget = null;
    removing = false;
  }
  const saveChannel = () =>
    change(() => api.antiTamper.setReportChannel(guildId, reportChannel || null), reportChannel ? 'Report channel saved' : 'Reporting stopped');

  onMount(async () => {
    const [loaded, roleList, channelList] = await Promise.allSettled([api.antiTamper.rules(guildId), api.roles(guildId), api.channels(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (loaded.status === 'fulfilled') apply(loaded.value);
    else toast('error', loaded.reason?.message ?? 'Could not load the anti tamper rules');
  });
</script>

<PageHeader module="anti-tamper" description="Roles only chosen people can hold" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tab}
      tabs={[
        { id: 'roles', label: 'Roles', icon: ShieldAlert, count: rules ? rules.roles.length : null },
        { id: 'exceptions', label: 'Global exceptions', icon: UserCheck, count: rules ? rules.exceptions.length : null },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    {#if isAdmin && tab !== 'settings'}
      <Button variant="primary" onclick={() => (tab === 'roles' ? (addingRole = !addingRole) : (addingException = !addingException))}>
        <Plus class="w-3.5 h-3.5" />{tab === 'roles' ? 'Protect role' : 'Add exception'}
      </Button>
    {/if}
  </div>

  {#if rules}<WarningBanner warnings={rules.warnings} />{/if}

  {#if tab === 'settings'}
    <Card>
      <SectionTitle icon={Megaphone} title="Report channel" class="mb-5" />
      <span class={label}>Channel</span>
      <p class="mb-2.5 text-xs text-zinc-500">Where the bot says who got a protected role and who gave it. Pick Not reported to stay silent; the audit log still records everything.</p>
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
  {:else if tab === 'exceptions'}
    {#if rules}
      <RoleExceptions
        exceptions={rules.exceptions}
        {roles}
        canEdit={isAdmin}
        bind:adding={addingException}
        hint="Global: the people and roles listed here may hold EVERY protected role. To allow someone for just one role, open that role in the Roles tab. Nobody is exempt on their own: not the server owner, not moderators or admins, not other bots, so list everyone who should keep one."
        onAdd={async target => change(() => api.antiTamper.addException(guildId, target), 'Exception added')}
        onRemove={async target => change(() => api.antiTamper.removeException(guildId, target), 'Exception removed')}
      />
    {:else}
      <Card flush>
        <TableSkeleton
            columns={['w-16', 'flex-1', 'w-36', ...(isAdmin ? ['w-16'] : [])]}
            headings={['#', 'Who', 'Type', ...(isAdmin ? [''] : [])]}
            kinds={['bar', 'bar', 'pill', ...(isAdmin ? ['action' as const] : [])]}
            rows={4}
            rowHeight="h-14"
          />
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
            columns={['w-16', 'flex-1', isAdmin ? 'w-24' : 'w-16']}
            headings={['#', 'Role', '']}
            kinds={['bar', 'bar', isAdmin ? 'actions' : 'action']}
            rows={4}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Role</th>
                {#if hasLocal}<th class="{th} w-72" title="Who may hold only this role, on top of the global exceptions">Exceptions</th>{/if}
                <th class="{th} {isAdmin ? 'w-24' : 'w-16'}"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each rules.roles as rule, i (rule.role_id)}
                {@const role = roleOf(rule.role_id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{i + 1}</td>
                  <td class={cell}>
                    <RoleChip {role} />
                    {#if rule.problem}
                      <p class="mt-0.5 flex items-center gap-1 text-xs text-amber-400"><TriangleAlert class="w-3 h-3 shrink-0" />{rule.problem}</p>
                    {/if}
                  </td>
                  {#if hasLocal}
                    <td class={cell}>
                      {#if rule.exceptions.length === 1}
                        {@const only = rule.exceptions[0]}
                        {#if only.target_type === 'user' && only.user}
                          <ActorCell actor={only.user} />
                        {:else if only.target_type === 'role'}
                          <RoleChip role={roleOf(only.target_id)} missing="Deleted role" />
                        {:else}
                          <span class="font-mono text-xs text-zinc-400">{only.target_id}</span>
                        {/if}
                      {:else if rule.exceptions.length > 1}
                        <div class="flex items-center gap-3">
                          <AvatarStack items={stackOf(rule.exceptions)} />
                          <span class="text-xs text-zinc-400">{summaryOf(rule.exceptions)}</span>
                        </div>
                      {/if}
                    </td>
                  {/if}
                  <td class="{cell} text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Exceptions for this role"
                      title="Exceptions for this role"
                      onclick={() => ((openRole = openRole === rule.role_id ? null : rule.role_id), (addingLocal = false))}
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
                    <td colspan={hasLocal ? 4 : 3} class="p-0">
                      <div class="border-t border-zinc-800/40 bg-zinc-800/10 p-5" transition:slide={{ duration: 220, easing: cubicOut }}>
                        <div class="mb-4 flex items-center justify-between gap-3">
                          <SectionTitle icon={UserCheck} title="Exceptions for this role" />
                          {#if isAdmin}
                            <Button variant="secondary" onclick={() => (addingLocal = !addingLocal)}><Plus class="w-3.5 h-3.5" />Add exception</Button>
                          {/if}
                        </div>
                        <RoleExceptions
                          exceptions={rule.exceptions}
                          {roles}
                          canEdit={isAdmin}
                          bind:adding={addingLocal}
                          compact
                          hint="Only for this role: the people and roles listed here may hold it, on top of the global exceptions. Anyone else who ends up with it loses it again."
                          onAdd={async target => change(() => api.antiTamper.addRoleException(guildId, rule.role_id, target), 'Exception added')}
                          onRemove={async target => change(() => api.antiTamper.removeRoleException(guildId, rule.role_id, target), 'Exception removed')}
                        />
                      </div>
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
  busy={removing}
  icon={Trash2}
  onConfirm={confirmRemove}
  onClose={() => (removeTarget = null)}
>
  {#if removeTarget}
    <span class="text-zinc-200">{roles.find(r => r.id === removeTarget)?.name ?? 'This role'}</span> can then be held by anyone again. People who hold it now keep it.
  {/if}
</ConfirmModal>
