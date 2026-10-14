<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import RoleChip from '$lib/components/RoleChip.svelte';
  import RoleExceptions from '$lib/components/RoleExceptions.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import { api, type BoosterRoleFlags, type BoosterRoleRule, type BoosterRules, type DiscordChannel, type DiscordRole } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { label, td, th } from '$lib/ui';
  import { Lock, Megaphone, Plus, Radar, Rocket, Settings, TriangleAlert, Trash2, UserCheck } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let tab = $state('roles');
  let rules: BoosterRules | null = $state(null);
  let roles: DiscordRole[] = $state([]);
  let channels: DiscordChannel[] = $state([]);

  let pickedRole = $state('');
  let addingRole = $state(false);
  let addingException = $state(false);
  let logChannel = $state('');
  let savedChannel = '';

  const cell = td.replace('h-11', 'h-14');
  const roleOf = (id: string) => roles.find(r => r.id === id);
  const takenRoles = $derived.by(() => ((rules as BoosterRules | null)?.roles ?? []).map(r => r.role_id));

  function apply(next: BoosterRules) {
    rules = next;
    savedChannel = logChannel = next.log_channel_id ?? '';
  }

  /** Runs a change and shows what the server answers; on failure the page keeps what it had. */
  async function change(action: () => Promise<BoosterRules>, success?: string): Promise<boolean> {
    try {
      apply(await action());
      if (success) toast('success', success);
      return true;
    } catch (e: any) {
      logChannel = savedChannel;
      toast('error', e.message);
      return false;
    }
  }

  const addRole = async () => {
    const roleId = pickedRole;
    pickedRole = '';
    if (await change(() => api.booster.saveRole(guildId, roleId, { assign_on_boost: false, remove_on_unboost: false, guard: true }), 'Booster role added')) addingRole = false;
  };
  const setFlag = (rule: BoosterRoleRule, flag: keyof BoosterRoleFlags) =>
    change(() =>
      api.booster.saveRole(guildId, rule.role_id, {
        assign_on_boost: rule.assign_on_boost,
        remove_on_unboost: rule.remove_on_unboost,
        guard: rule.guard,
        [flag]: !rule[flag],
      }),
    );
  let removeTarget: BoosterRoleRule | null = $state(null);
  let removing = $state(false);
  async function confirmRemove() {
    if (!removeTarget) return;
    removing = true;
    if (await change(() => api.booster.removeRole(guildId, removeTarget!.role_id), 'Booster role removed')) removeTarget = null;
    removing = false;
  }
  const saveChannel = () => change(() => api.booster.setLogChannel(guildId, logChannel || null), logChannel ? 'Log channel saved' : 'Logging stopped');

  onMount(async () => {
    const [loaded, roleList, channelList] = await Promise.allSettled([api.booster.rules(guildId), api.roles(guildId), api.channels(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (loaded.status === 'fulfilled') apply(loaded.value);
    else toast('error', loaded.reason?.message ?? 'Could not load the booster rules');
  });
</script>

<PageHeader module="booster" description="Roles that belong to server boosters" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tab}
      tabs={[
        { id: 'roles', label: 'Roles', icon: Rocket, count: rules ? rules.roles.length : null },
        { id: 'exceptions', label: 'Exceptions', icon: UserCheck, count: rules ? rules.exceptions.length : null },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    {#if isAdmin && tab !== 'settings'}
      <Button variant="primary" onclick={() => (tab === 'roles' ? (addingRole = !addingRole) : (addingException = !addingException))}>
        <Plus class="w-3.5 h-3.5" />{tab === 'roles' ? 'Add role' : 'Add exception'}
      </Button>
    {/if}
  </div>

  {#if rules}<WarningBanner warnings={rules.warnings} />{/if}

  {#if tab === 'settings'}
    <Card>
      <SectionTitle icon={Megaphone} title="Log channel" class="mb-5" />
      <span class={label}>Channel</span>
      <p class="mb-2.5 text-xs text-zinc-500">Where the bot says which roles it gave or took. Pick Not logged to stay silent; the audit log still records everything.</p>
      {#if rules}
        <ChannelPicker {channels} bind:value={logChannel} onchange={saveChannel} none="Not logged" label="Log channel" disabled={!isAdmin} class="w-full sm:w-80" />
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
        hint="Only the people and roles listed here are never stripped of booster roles, for example staff who were given one by hand. Nobody is exempt on their own: not the server owner, not moderators or admins, not other bots."
        onAdd={async target => change(() => api.booster.addException(guildId, target), 'Exception added')}
        onRemove={async target => change(() => api.booster.removeException(guildId, target), 'Exception removed')}
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
        <SectionTitle icon={Plus} title="Add a booster role" class="mb-1" />
        <p class="mb-4 text-xs text-zinc-500">New roles start with the guard on: anyone holding the role without boosting loses it. Change what each role does in the table.</p>
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="w-full sm:w-80">
            <span class={label}>Role</span>
            {#if rules}
              <RoleSelect {roles} manageable exclude={takenRoles} bind:value={pickedRole} class="w-full" />
            {:else}
              <ControlSkeleton class="w-full" />
            {/if}
          </div>
          <Button variant="primary" onclick={addRole} disabled={!pickedRole}><Plus class="w-3.5 h-3.5" />Add</Button>
          <Button variant="ghost" onclick={() => (addingRole = false)}>Cancel</Button>
        </div>
      </Card>
      </div>
    {/if}

    {#if rules && rules.roles.length === 0}
      <EmptyState kind="modules" title="No booster roles" description="Add a role to give it to boosters, take it back when they stop, or keep it off everyone else." />
    {:else}
      <Card flush>
        {#if !rules}
          <TableSkeleton
            columns={['w-16', 'flex-1', 'w-40', 'w-40', 'w-40', ...(isAdmin ? ['w-16'] : [])]}
            headings={['#', 'Role', 'Assign on boost', 'Remove on stop', 'Guard', ...(isAdmin ? [''] : [])]}
            kinds={['bar', 'bar', 'toggle', 'toggle', 'toggle', ...(isAdmin ? ['action' as const] : [])]}
            rows={4}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Role</th>
                <th class="{th} w-40" title="Give the role when someone starts boosting">Assign on boost</th>
                <th class="{th} w-40" title="Take the role back when someone stops boosting">Remove on stop</th>
                <th class="{th} w-40" title="Take the role from anyone holding it without boosting">Guard</th>
                {#if isAdmin}<th class="{th} w-16"><span class="sr-only">Actions</span></th>{/if}
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
                  <td class={cell}><Toggle on={rule.assign_on_boost} disabled={!isAdmin} label="Assign {role?.name ?? rule.role_id} on boost" onclick={() => setFlag(rule, 'assign_on_boost')} /></td>
                  <td class={cell}><Toggle on={rule.remove_on_unboost} disabled={!isAdmin} label="Remove {role?.name ?? rule.role_id} when boosting stops" onclick={() => setFlag(rule, 'remove_on_unboost')} /></td>
                  <td class={cell}><Toggle on={rule.guard} disabled={!isAdmin} label="Guard {role?.name ?? rule.role_id}" onclick={() => setFlag(rule, 'guard')} /></td>
                  {#if isAdmin}
                    <td class="{cell} text-right">
                      <Button variant="ghost" size="icon" aria-label="Remove booster role" onclick={() => (removeTarget = rule)}>
                        <Trash2 class="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </td>
                  {/if}
                </tr>
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
  title="Remove this booster role?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={removing}
  icon={Trash2}
  onConfirm={confirmRemove}
  onClose={() => (removeTarget = null)}
>
  {#if removeTarget}
    <span class="text-zinc-200">{roles.find(r => r.id === removeTarget!.role_id)?.name ?? 'This role'}</span> stops being managed for boosters: it is no longer given, taken back or guarded. The role itself and who holds it stay as they are.
  {/if}
</ConfirmModal>
