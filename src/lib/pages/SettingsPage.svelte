<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import RolePicker from '$lib/components/RolePicker.svelte';
  import { api, type DiscordRole, type GuildSettings } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { Settings } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let saved: GuildSettings | null = $state(null);
  let draft: GuildSettings | null = $state(null);
  let roles: DiscordRole[] = $state([]);
  let loading = $state(true);
  let saving = $state(false);

  const timezones = ['UTC', ...Intl.supportedValuesOf('timeZone')];
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
      toast('success', 'Settings saved');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }
</script>

<PageHeader title="Settings" description="Server-wide settings" icon={Settings}>
  {#snippet actions()}
    {#if isAdmin}
      <button
        onclick={save}
        disabled={!dirty || saving}
        class="px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-sm font-semibold text-orange-400 ring-1 ring-orange-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    {/if}
  {/snippet}
</PageHeader>

<div class="space-y-4">
  <Card>
    {#if loading || !draft}
      <FormSkeleton fields={2} />
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="language" class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Language</label>
          <input id="language" bind:value={draft.language} disabled={!isAdmin} class="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-orange-500/30 disabled:opacity-60" />
        </div>
        <div>
          <label for="timezone" class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Timezone</label>
          <input id="timezone" list="timezones" bind:value={draft.timezone} disabled={!isAdmin} class="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-orange-500/30 disabled:opacity-60" />
          <datalist id="timezones">{#each timezones as tz}<option value={tz}></option>{/each}</datalist>
        </div>
      </div>
    {/if}
  </Card>

  <Card>
    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Access roles</h3>
    <p class="text-xs text-slate-500 mt-1 mb-4">
      Admins are anyone with Administrator or Manage Server; moderators anyone with Manage Messages or a member-moderation permission. Add roles here to grant the same access by role.
    </p>
    {#if loading || !draft}
      <FormSkeleton fields={2} />
    {:else}
      <div class="space-y-4">
        <div>
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Extra admin roles</span>
          <RolePicker {roles} selected={draft.admin_role_ids} disabled={!isAdmin} onchange={(next) => (draft!.admin_role_ids = next)} />
        </div>
        <div>
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Extra moderator roles</span>
          <RolePicker {roles} selected={draft.moderator_role_ids} disabled={!isAdmin} onchange={(next) => (draft!.moderator_role_ids = next)} />
        </div>
      </div>
    {/if}
  </Card>
</div>
