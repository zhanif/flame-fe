<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import Input from '$lib/components/Input.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { api, type BingoConfig, type DiscordChannel, type DiscordRole } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { Hash, RefreshCw, Settings } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  // The forum where rounds live, the pattern that recognises a round, the roles, and the rescan for threads that
  // were created before the module was installed.
  let {
    guildId,
    config,
    isAdmin,
    onSaved,
  }: { guildId: string; config: BingoConfig; isAdmin: boolean; onSaved: (config: BingoConfig) => void } = $props();

  let channels: DiscordChannel[] = $state([]);
  let roles: DiscordRole[] = $state([]);
  let channelId = $state(untrack(() => config.channel_id ?? ''));
  let regex = $state(untrack(() => config.tag_regex ?? ''));
  let participant = $state(untrack(() => config.participant_role_id ?? ''));
  let newcomer = $state(untrack(() => config.newcomer_role_id ?? ''));
  let positive = $state(untrack(() => config.positive_role_id ?? ''));
  let negative = $state(untrack(() => config.negative_role_id ?? ''));
  let announce = $state(untrack(() => config.announce_board));
  let upperThreshold = $state(untrack(() => config.upper_threshold ?? 0));
  let lowerThreshold = $state(untrack(() => config.lower_threshold ?? 0));
  let saving = $state(false);
  let rescanning = $state(false);
  let scanned = $state<{ found: number; created: number } | null>(null);
  let sample = $state('');
  let tested = $state<{ match: string | null; index: number | null } | null>(null);
  let testing = $state(false);

  const dirty = $derived(
    channelId !== (config.channel_id ?? '') ||
      regex !== (config.tag_regex ?? '') ||
      participant !== (config.participant_role_id ?? '') ||
      newcomer !== (config.newcomer_role_id ?? '') ||
      positive !== (config.positive_role_id ?? '') ||
      negative !== (config.negative_role_id ?? '') ||
      announce !== config.announce_board ||
      upperThreshold !== (config.upper_threshold ?? 0) ||
      lowerThreshold !== (config.lower_threshold ?? 0),
  );

  onMount(async () => {
    const [channelList, roleList] = await Promise.allSettled([api.channels(guildId), api.roles(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (roleList.status === 'fulfilled') roles = roleList.value;
  });

  async function save() {
    saving = true;
    try {
      const next = await api.bingo.saveConfig(guildId, {
        channel_id: channelId || null,
        tag_regex: regex.trim() || null,
        participant_role_id: participant || null,
        newcomer_role_id: newcomer || null,
        positive_role_id: positive || null,
        negative_role_id: negative || null,
        announce_board: announce,
        upper_threshold: upperThreshold,
        lower_threshold: lowerThreshold,
      });
      onSaved(next);
      toast('success', 'Settings saved', 'New threads in the forum are recognised from now on.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function test() {
    testing = true;
    try {
      tested = await api.bingo.testRegex(guildId, regex, sample);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      testing = false;
    }
  }

  async function rescan() {
    rescanning = true;
    try {
      scanned = await api.bingo.rescan(guildId);
      const { found, created } = scanned;
      toast('success', 'Forum scanned', `${found} thread${found === 1 ? '' : 's'} read, ${created} new round${created === 1 ? '' : 's'}.`);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      rescanning = false;
    }
  }
</script>

<div class="space-y-5">
  <Card>
    <SectionTitle icon={Hash} title="Where rounds live" class="mb-4" />
    <SettingRow title="Bingo forum" hint="A new thread in this forum becomes a round when its first message carries the tag.">
      <ChannelPicker {channels} types={[15]} bind:value={channelId} none="Pick a forum" label="Bingo forum" disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Tag pattern" hint="A regular expression tested against the first message of a thread, for example #Chapter\\d+.">
      <Input bind:value={regex} maxlength={config.limits.regex} disabled={!isAdmin} placeholder="#Chapter\\d+" aria-label="Tag pattern" />
    </SettingRow>
    <SettingRow title="Try it" hint="Paste a thread's first message to see the tag it would give.">
      <div class="space-y-2">
        <Textarea bind:value={sample} rows={2} disabled={!isAdmin} placeholder="Join this #Chapter32" aria-label="Sample message" />
        <div class="flex items-center gap-2">
          <Button variant="secondary" onclick={test} disabled={!isAdmin || testing || !sample.trim()}>Test pattern</Button>
          {#if tested}
            <span class="text-xs {tested.match ? 'text-emerald-400' : 'text-amber-400'}">
              {tested.match ? `Tag: ${tested.match}` : 'No match: that thread would not become a round'}
            </span>
          {/if}
        </div>
      </div>
    </SettingRow>
    <SettingRow
      title="Send the board automatically"
      hint="Once a round's board is designed, post it in the thread without pressing anything."
    >
      <div class="flex items-center justify-end gap-3">
        <span class="text-sm text-zinc-300">{announce ? 'On' : 'Off'}</span>
        <Toggle on={announce} disabled={!isAdmin} label="Send the board automatically" onclick={() => (announce = !announce)} />
      </div>
    </SettingRow>
    <SettingRow title="Upper threshold" hint="Total participant score above this suggests the positive together mode.">
      <Input type="number" bind:value={upperThreshold} disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Lower threshold" hint="Total participant score below this suggests the negative together mode.">
      <Input type="number" bind:value={lowerThreshold} disabled={!isAdmin} />
    </SettingRow>
  </Card>

  <Card>
    <SectionTitle icon={Settings} title="Roles" class="mb-4" />
    <SettingRow title="Participant role" hint="Given to whoever submits a valid entry. Needs Manage Roles.">
      <RoleSelect {roles} bind:value={participant} none="No role" label="Participant role" manageable disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Newcomer role" hint="Holders of this role are ranked outside the results.">
      <RoleSelect {roles} bind:value={newcomer} none="Everyone is ranked" label="Newcomer role" disabled={!isAdmin} />
    </SettingRow>
    <SettingRow
      title="Positive together role"
      hint="The role the together mode applies to the ranked participants, and that a member can join with /bingo together."
    >
      <RoleSelect {roles} bind:value={positive} none="No role" label="Positive together role" manageable disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Negative together role" hint="The other side of the together mode: applied instead of the positive one, never both.">
      <RoleSelect {roles} bind:value={negative} none="No role" label="Negative together role" manageable disabled={!isAdmin} />
    </SettingRow>
  </Card>

  {#if isAdmin}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={rescan} disabled={rescanning || !channelId}>
        <RefreshCw class="h-3.5 w-3.5" />{rescanning ? 'Scanning…' : 'Scan forum'}
      </Button>
      <SaveButton onclick={save} disabled={!dirty} {saving} />
    </div>
  {/if}
</div>
