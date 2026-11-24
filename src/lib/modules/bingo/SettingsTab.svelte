<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import CommandPill from '$lib/components/CommandPill.svelte';
  import Input from '$lib/components/Input.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import { api, type BingoConfig, type BingoMode, type DiscordChannel, type DiscordRole } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { Hash, MessagesSquare, Settings } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  // Where rounds live (a forum thread per round, or one channel with a started round), the pattern that
  // recognises a thread in thread mode, the roles, and the rescan for threads that predate the module.
  let {
    guildId,
    config,
    isAdmin,
    onSaved,
    saving = $bindable(false),
    rescanning = $bindable(false),
    dirty = $bindable(false),
    canRescan = $bindable(false),
  }: {
    guildId: string;
    config: BingoConfig;
    isAdmin: boolean;
    onSaved: (config: BingoConfig) => void;
    saving?: boolean;
    rescanning?: boolean;
    dirty?: boolean;
    canRescan?: boolean;
  } = $props();

  let channels: DiscordChannel[] = $state([]);
  let roles: DiscordRole[] = $state([]);
  let mode = $state<BingoMode>(untrack(() => config.mode));
  let channelId = $state(untrack(() => config.channel_id ?? ''));
  let regex = $state(untrack(() => config.tag_regex ?? ''));
  let participant = $state(untrack(() => config.participant_role_id ?? ''));
  let newcomer = $state(untrack(() => config.newcomer_role_id ?? ''));
  let positive = $state(untrack(() => config.positive_role_id ?? ''));
  let negative = $state(untrack(() => config.negative_role_id ?? ''));
  let upperThreshold = $state(untrack(() => config.upper_threshold ?? 0));
  let lowerThreshold = $state(untrack(() => config.lower_threshold ?? 0));
  let scanned = $state<{ found: number; created: number } | null>(null);
  let sample = $state('');
  let tested = $state<{ match: string | null; index: number | null } | null>(null);
  let testing = $state(false);

  // Switching the mode drops the picked channel: a forum is not a channel, and the other way round.
  let lastMode = untrack(() => config.mode);
  $effect(() => {
    if (mode !== lastMode) {
      lastMode = mode;
      channelId = '';
    }
  });

  $effect(() => {
    dirty =
      mode !== config.mode ||
      channelId !== (config.channel_id ?? '') ||
      regex !== (config.tag_regex ?? '') ||
      participant !== (config.participant_role_id ?? '') ||
      newcomer !== (config.newcomer_role_id ?? '') ||
      positive !== (config.positive_role_id ?? '') ||
      negative !== (config.negative_role_id ?? '') ||
      upperThreshold !== (config.upper_threshold ?? 0) ||
      lowerThreshold !== (config.lower_threshold ?? 0);
  });

  $effect(() => {
    canRescan = mode === 'thread' && !!channelId && !rescanning;
  });

  onMount(async () => {
    const [channelList, roleList] = await Promise.allSettled([api.channels(guildId), api.roles(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (roleList.status === 'fulfilled') roles = roleList.value;
  });

  export async function save() {
    saving = true;
    try {
      const next = await api.bingo.saveConfig(guildId, {
        mode,
        channel_id: channelId || null,
        tag_regex: mode === 'thread' ? regex.trim() || null : null,
        participant_role_id: participant || null,
        newcomer_role_id: newcomer || null,
        positive_role_id: positive || null,
        negative_role_id: negative || null,
        upper_threshold: upperThreshold,
        lower_threshold: lowerThreshold,
      });
      onSaved(next);
      toast(
        'success',
        'Settings saved',
        mode === 'thread' ? 'New threads in the forum are recognised from now on.' : 'Start a round with /bingo-manager start.',
      );
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

  export async function rescan() {
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
    <SettingRow title="Mode">
      {#snippet hintSnippet()}
        Thread mode turns tagged forum threads into rounds. Channel mode runs one round at a time, started with
        <CommandPill command="/bingo-manager" />.
      {/snippet}
      <SegmentedControl
        bind:value={mode}
        label="Bingo mode"
        options={[
          { id: 'thread', label: 'Threads', icon: Hash },
          { id: 'channel', label: 'Channel', icon: MessagesSquare },
        ]}
      />
    </SettingRow>
    {#if mode === 'thread'}
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
    {:else}
      <SettingRow title="Bingo channel" hint="Rounds are held here. A member submits with a message that opens with the round tag.">
        <ChannelPicker {channels} types={[0, 5]} bind:value={channelId} none="Pick a channel" label="Bingo channel" disabled={!isAdmin} />
      </SettingRow>
    {/if}
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
    <SettingRow title="Positive together role">
      {#snippet hintSnippet()}
        The role the together mode applies to the ranked participants, and that a member can join with
        <CommandPill command="/bingo together" />.
      {/snippet}
      <RoleSelect {roles} bind:value={positive} none="No role" label="Positive together role" manageable disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Negative together role" hint="The other side of the together mode: applied instead of the positive one, never both.">
      <RoleSelect {roles} bind:value={negative} none="No role" label="Negative together role" manageable disabled={!isAdmin} />
    </SettingRow>
  </Card>
</div>
