<script lang="ts">
  import RoleChip from '$lib/components/RoleChip.svelte';
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import Select from '$lib/components/Select.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import type { DiscordRole, RoleExemption } from '$lib/api/endpoints';
  import { label, td, th } from '$lib/ui';
  import { Plus, Trash2, UserCheck } from '@lucide/svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  // The people a role rule leaves alone: users by id, and roles (everyone who holds them).
  let {
    exceptions,
    roles,
    canEdit,
    hint,
    adding = $bindable(false),
    onAdd,
    onRemove,
  }: {
    exceptions: RoleExemption[];
    roles: DiscordRole[];
    canEdit: boolean;
    hint: string;
    /** Whether the add panel is open; the page's Add button toggles it. */
    adding?: boolean;
    /** Resolves true when the exception was added. */
    onAdd: (target: Pick<RoleExemption, 'target_type' | 'target_id'>) => Promise<boolean>;
    onRemove: (target: RoleExemption) => Promise<unknown>;
  } = $props();

  // The Select's first entry is its empty choice: empty means Role, so only User is listed.
  let kind = $state('');
  let pickedRole = $state('');
  let userId = $state('');
  let busy = $state(false);
  let removeTarget: RoleExemption | null = $state(null);
  let removing = $state(false);

  const cell = td.replace('h-11', 'h-14');
  const takenRoles = $derived(exceptions.filter(e => e.target_type === 'role').map(e => e.target_id));
  const isUser = $derived(kind === 'user');
  const target = $derived(isUser ? userId.trim() : pickedRole);
  const roleOf = (id: string) => roles.find(r => r.id === id);

  const nameOf = (exception: RoleExemption) =>
    exception.target_type === 'user' ? (exception.user?.name ?? exception.target_id) : (roleOf(exception.target_id)?.name ?? 'this role');

  async function confirmRemove() {
    if (!removeTarget) return;
    removing = true;
    try {
      await onRemove(removeTarget);
      removeTarget = null;
    } finally {
      removing = false;
    }
  }

  async function add() {
    if (!target || busy) return;
    busy = true;
    try {
      if (await onAdd({ target_type: isUser ? 'user' : 'role', target_id: target })) {
        pickedRole = '';
        userId = '';
        adding = false;
      }
    } finally {
      busy = false;
    }
  }
</script>

{#if canEdit && adding}
  <div class="pb-5" transition:slide={{ duration: 220, easing: cubicOut }}>
  <Card>
    <SectionTitle icon={UserCheck} title="Add an exception" class="mb-1" />
    <p class="mb-4 text-xs text-zinc-500">{hint}</p>
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <div class="w-full sm:w-40">
        <span class={label}>Type</span>
        <Select
          bind:value={kind}
          options={[{ value: 'user', label: 'User' }]}
          placeholder="Role"
          label="Exception type"
          class="w-full"
        />
      </div>
      <div class="w-full sm:w-80">
        <span class={label}>{isUser ? 'User id' : 'Role'}</span>
        {#if isUser}
          <Input bind:value={userId} placeholder="Discord user id" aria-label="User id" inputmode="numeric" />
        {:else}
          <RoleSelect {roles} exclude={takenRoles} bind:value={pickedRole} class="w-full" />
        {/if}
      </div>
      <Button variant="primary" onclick={add} disabled={!target || busy}><Plus class="w-3.5 h-3.5" />Add</Button>
      <Button variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
    </div>
  </Card>
  </div>
{/if}

{#if exceptions.length === 0}
  <EmptyState kind="search" title="No exceptions" description="Nobody is left alone yet. Add a user or a role above." />
{:else}
  <Card flush>
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
          <th class="{th} w-16">#</th>
          <th class={th}>Who</th>
          <th class="{th} w-36">Type</th>
          {#if canEdit}<th class="{th} w-16"><span class="sr-only">Actions</span></th>{/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-800/30">
        {#each exceptions as exception, i (exception.target_type + exception.target_id)}
          {@const role = exception.target_type === 'role' ? roleOf(exception.target_id) : undefined}
          <tr class="hover:bg-zinc-800/30 transition-colors">
            <td class="{cell} text-zinc-500">{i + 1}</td>
            <td class={cell}>
              {#if exception.target_type === 'user' && exception.user}
                <ActorCell actor={exception.user} />
              {:else}
                <RoleChip {role} missing="Deleted role" />
              {/if}
            </td>
            <td class={cell}><Badge tone={exception.target_type === 'role' ? 'accent' : 'neutral'}>{exception.target_type === 'role' ? 'Role' : 'User'}</Badge></td>
            {#if canEdit}
              <td class="{cell} text-right">
                <Button variant="ghost" size="icon" aria-label="Remove exception" onclick={() => (removeTarget = exception)}>
                  <Trash2 class="w-3.5 h-3.5 text-red-400" />
                </Button>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
{/if}

<ConfirmModal
  show={!!removeTarget}
  title="Remove this exception?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={removing}
  icon={Trash2}
  onConfirm={confirmRemove}
  onClose={() => (removeTarget = null)}
>
  {#if removeTarget}
    <span class="text-zinc-200">{nameOf(removeTarget)}</span> will no longer be left alone by this rule, so the rule applies to {removeTarget.target_type === 'user' ? 'them' : 'everyone who holds this role'} again.
  {/if}
</ConfirmModal>
