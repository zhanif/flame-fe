<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Combobox from '$lib/components/Combobox.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import RolePicker from '$lib/components/RolePicker.svelte';
  import { api, type DiscordRole, type GuildSettings } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { timeIn, timezoneOptions } from '$lib/timezones';
  import { control, label } from '$lib/ui';
  import { Globe, Lock, ShieldCheck } from '@lucide/svelte';
  import { onDestroy, onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let saved: GuildSettings | null = $state(null);
  let draft: GuildSettings | null = $state(null);
  let roles: DiscordRole[] = $state([]);
  let loading = $state(true);
  let saving = $state(false);

  const timezones = timezoneOptions();
  const languages = [{ value: 'en', flag: '🇬🇧', name: 'English' }];
  let now = $state(new Date());
  const clock = setInterval(() => (now = new Date()), 15_000);
  onDestroy(() => clearInterval(clock));
  const adminByPermission = $derived(roles.filter(r => r.access === 'admin').map(r => r.id));
  const moderatorByPermission = $derived(roles.filter(r => r.access === 'moderator').map(r => r.id));
  const dirty = $derived(!!saved && !!draft && JSON.stringify(saved) !== JSON.stringify(draft));

  onMount(async () => {
    try {
      [saved, roles] = await Promise.all([api.settings(guildId), api.roles(guildId)]);
      draft = structuredClone($state.snapshot(saved)) as GuildSettings;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  });

  async function save() {
    if (!draft || saving) return;
    saving = true;
    try {
      saved = await api.updateSettings(guildId, draft);
      draft = structuredClone($state.snapshot(saved)) as GuildSettings;
      toast('success', 'Settings saved', 'Your changes are now live for this server.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }
</script>

{#snippet included(perms: string[])}
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-2.5 text-xs text-zinc-500">
    <Lock class="w-3 h-3 shrink-0" />
    Included automatically with
    {#each perms as perm}
      <span class="px-1.5 py-0.5 rounded-md bg-zinc-800 ring-1 ring-zinc-700 text-zinc-300 font-mono">{perm}</span>
    {/each}
  </p>
{/snippet}

<PageHeader page="settings" description="Server-wide settings" />

<div class="space-y-5">
  <Card>
    <SectionTitle icon={Globe} title="General" class="mb-5" />
    {#if loading || !draft}
      <FormSkeleton fields={3} grid hint />
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label for="language" class={label}>Language</label>
          <p class="mb-2.5 text-xs text-zinc-500">Bot and dashboard language. English only for now.</p>
          <div class="relative">
            <select id="language" bind:value={draft.language} disabled title="English is the only language available for now" class="{control} appearance-none w-full h-9 pl-3 pr-9 text-sm cursor-not-allowed">
              {#each languages as l}<option value={l.value}>{l.flag}  {l.name}</option>{/each}
            </select>
            <Lock class="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div>
          <label for="timezone" class={label}>Timezone</label>
          <p class="mb-2.5 text-xs text-zinc-500">
            Used for dates and times. Now: {#if timeIn(draft.timezone, now)}<span class="text-zinc-300 font-medium">{timeIn(draft.timezone, now)}</span>{/if}
          </p>
          <Combobox id="timezone" bind:value={draft.timezone} options={timezones} placeholder="Search by city or offset, e.g. Jakarta, UTC +7" label="Timezone" disabled={!isAdmin} />
        </div>
        <div>
          <label for="prefix" class={label}>Prefix</label>
          <p class="mb-2.5 text-xs text-zinc-500">
            Starts a text command, like <span class="font-mono text-zinc-300">{draft.prefix || 'f!'}ping</span>. 1 to 5 characters, no spaces.
          </p>
          <Input id="prefix" bind:value={draft.prefix} maxlength={5} disabled={!isAdmin} />
        </div>
      </div>
    {/if}
  </Card>

  <Card>
    <SectionTitle icon={ShieldCheck} title="Access roles" class="mb-5" />
    {#if loading || !draft}
      <FormSkeleton fields={2} hint />
    {:else}
      <div class="space-y-5">
        <div>
          <span class={label}>Admin roles</span>
          {@render included(['Administrator', 'Manage Server'])}
          <RolePicker {roles} selected={draft.admin_role_ids} locked={adminByPermission} lockedHint="Has Administrator or Manage Server, so it is always an admin role" disabled={!isAdmin} onchange={(next) => (draft!.admin_role_ids = next)} />
        </div>
        <div>
          <span class={label}>Moderator roles</span>
          {@render included(['Manage Messages', 'Moderate Members', 'Kick Members', 'Ban Members'])}
          <RolePicker {roles} selected={draft.moderator_role_ids} locked={moderatorByPermission} hidden={adminByPermission} lockedHint="Has a moderation permission, so it is always a moderator role" disabled={!isAdmin} onchange={(next) => (draft!.moderator_role_ids = next)} />
        </div>
      </div>
    {/if}
  </Card>

  {#if isAdmin && loading}
    <div class="flex justify-end"><ControlSkeleton class="w-36" h="h-8" /></div>
  {:else if isAdmin}
    <div class="flex justify-end">
      <Button variant="primary" onclick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </div>
  {/if}
</div>
