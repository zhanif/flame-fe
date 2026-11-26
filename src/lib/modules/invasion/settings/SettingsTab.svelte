<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import Combobox from '$lib/components/Combobox.svelte';
  import Input from '$lib/components/Input.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { api } from '$lib/api/endpoints';
  import type {
    DiscordChannel,
    DiscordRole,
    InvasionChannelType,
    InvasionConfig,
    InvasionLevelRole,
    InvasionLevellingMode,
  } from '$lib/api/endpoints';
  import { onlyDigits, restrictTo } from '$lib/utils/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { Gauge, Hash, Layers, MessagesSquare, Plus, Server, Snowflake, Trash2 } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  // Where rounds live (tagged forum threads, or one channel), the tag that marks a round, the participant
  // role, how a member's level is read, and the economy freeze.
  let {
    guildId,
    config,
    isAdmin,
    onSaved,
    saving = $bindable(false),
    dirty = $bindable(false),
  }: {
    guildId: string;
    config: InvasionConfig;
    isAdmin: boolean;
    onSaved: (config: InvasionConfig) => void;
    saving?: boolean;
    dirty?: boolean;
  } = $props();

  const MAX_RANKS = 25;

  let channels: DiscordChannel[] = $state([]);
  let roles: DiscordRole[] = $state([]);
  let loaded = $state(false);

  let channelType = $state<InvasionChannelType>(untrack(() => config.channel_type));
  let channelId = $state(untrack(() => config.channel_id ?? ''));
  let activeTagId = $state(untrack(() => config.active_tag_id ?? ''));
  let participant = $state(untrack(() => config.participant_role_id ?? ''));
  let levellingMode = $state<InvasionLevellingMode>(untrack(() => config.levelling_mode));
  let ranks = $state<{ role_id: string; level: string }[]>(
    untrack(() => config.level_roles.map(rank => ({ role_id: rank.role_id, level: String(rank.level) }))),
  );
  let freeze = $state(untrack(() => config.freeze_transactions));

  const forumTags = $derived(channels.find(c => c.id === channelId)?.tags ?? []);
  const tagOptions = $derived([{ value: '', label: 'No tag' }, ...forumTags.map(tag => ({ value: tag.id, label: tag.name }))]);

  const rankSignature = (list: { role_id: string; level: string | number }[]) =>
    JSON.stringify(
      list
        .filter(rank => rank.role_id)
        .map(rank => ({ role_id: rank.role_id, level: Number(rank.level) || 0 }))
        .sort((a, b) => a.level - b.level || a.role_id.localeCompare(b.role_id)),
    );

  // Switching the type drops the picked channel: a forum is not a channel, and the other way round.
  let lastType = untrack(() => config.channel_type);
  $effect(() => {
    if (channelType !== lastType) {
      lastType = channelType;
      channelId = '';
    }
  });

  // A tag belongs to one forum: drop it when the forum changes or when its tags are not loaded yet.
  $effect(() => {
    if (loaded && activeTagId && !forumTags.some(tag => tag.id === activeTagId)) activeTagId = '';
  });

  $effect(() => {
    dirty =
      channelType !== config.channel_type ||
      channelId !== (config.channel_id ?? '') ||
      activeTagId !== (config.active_tag_id ?? '') ||
      participant !== (config.participant_role_id ?? '') ||
      levellingMode !== config.levelling_mode ||
      freeze !== config.freeze_transactions ||
      (levellingMode === 'schema' && rankSignature(ranks) !== rankSignature(config.level_roles));
  });

  onMount(async () => {
    const [channelList, roleList] = await Promise.allSettled([api.channels(guildId), api.roles(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (roleList.status === 'fulfilled') roles = roleList.value;
    loaded = true;
  });

  function addRank() {
    ranks = [...ranks, { role_id: '', level: '' }];
  }

  function removeRank(index: number) {
    ranks = ranks.filter((_, i) => i !== index);
  }

  export async function save() {
    saving = true;
    try {
      const levelRoles: InvasionLevelRole[] = ranks
        .filter(rank => rank.role_id)
        .map(rank => ({ role_id: rank.role_id, level: Number(rank.level) || 1 }));
      const next = await api.invasion.saveConfig(guildId, {
        channel_type: channelType,
        channel_id: channelId || null,
        active_tag_id: channelType === 'thread' ? activeTagId || null : null,
        levelling_mode: levellingMode,
        level_roles: levellingMode === 'schema' ? levelRoles : [],
        participant_role_id: participant || null,
        freeze_transactions: freeze,
        alias_threshold: config.alias_threshold,
      });
      onSaved(next);
      toast(
        'success',
        'Settings saved',
        channelType === 'thread' ? 'New threads with the active tag become rounds.' : 'Rounds are held in the chosen channel.',
      );
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-5">
  <Card>
    <SectionTitle icon={Server} title="Server configuration" class="mb-4" />
    <SettingRow title="Channel type">
      {#snippet hintSnippet()}
        Thread type turns tagged threads in a forum into rounds. Channel type holds one round at a time in a single channel.
      {/snippet}
      <SegmentedControl
        bind:value={channelType}
        label="Invasion channel type"
        options={[
          { id: 'thread', label: 'Threads', icon: Hash },
          { id: 'channel', label: 'Channel', icon: MessagesSquare },
        ]}
      />
    </SettingRow>
    {#if channelType === 'thread'}
      <SettingRow title="Invasion forum" hint="Threads in this forum become rounds when they carry the active tag.">
        <ChannelPicker {channels} types={[15]} bind:value={channelId} none="Pick a forum" label="Invasion forum" disabled={!isAdmin} />
      </SettingRow>
      <SettingRow title="Active tag" hint="Only threads with this forum tag are counted as rounds. Pick the forum first.">
        <Combobox
          bind:value={activeTagId}
          options={tagOptions}
          label="Active tag"
          placeholder="Search tags..."
          disabled={!isAdmin || !channelId || !forumTags.length}
        />
      </SettingRow>
    {:else}
      <SettingRow title="Invasion channel" hint="Rounds are held here, one at a time.">
        <ChannelPicker
          {channels}
          types={[0, 5]}
          bind:value={channelId}
          none="Pick a channel"
          label="Invasion channel"
          disabled={!isAdmin}
        />
      </SettingRow>
    {/if}
    <SettingRow title="Participant role" hint="Given to a member who registers for an invasion round. Needs Manage Roles.">
      <RoleSelect {roles} bind:value={participant} none="No role" label="Participant role" manageable disabled={!isAdmin} />
    </SettingRow>
    <SettingRow title="Levelling">
      {#snippet hintSnippet()}
        Server schema reads a member's level from the rank roles below. Built in uses Flame's own levelling.
      {/snippet}
      <SegmentedControl
        bind:value={levellingMode}
        label="Levelling mode"
        options={[
          { id: 'schema', label: 'Server schema', icon: Layers },
          { id: 'built_in', label: 'Built in', icon: Gauge },
        ]}
      />
    </SettingRow>
    {#if levellingMode === 'schema'}
      <div class="py-5 first:pt-0 last:pb-0 border-b border-zinc-800/40 last:border-b-0">
        <p class="text-sm font-semibold text-zinc-100">Rank roles</p>
        <p class="mt-1 text-xs leading-relaxed text-zinc-500">
          Each role and the level it grants. A member can hold several ranks at once and counts as the highest one they hold, so two roles
          may share a level. Holding none of them counts as level 1.
        </p>
        <div class="mt-3 space-y-2">
          {#each ranks as rank, i (i)}
            <div class="flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <RoleSelect
                  {roles}
                  bind:value={rank.role_id}
                  exclude={ranks
                    .filter((_, j) => j !== i)
                    .map(other => other.role_id)
                    .filter(Boolean)}
                  none="Pick a role"
                  label="Rank role"
                  disabled={!isAdmin}
                />
              </div>
              <div class="w-40 shrink-0">
                <Input
                  bind:value={rank.level}
                  inputmode="numeric"
                  maxlength={3}
                  placeholder="Lv."
                  oninput={restrictTo(onlyDigits, value => (rank.level = value))}
                  aria-label="Rank level"
                  disabled={!isAdmin}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onclick={() => removeRank(i)}
                disabled={!isAdmin}
                aria-label="Remove rank"
                class="shrink-0"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          {/each}
          {#if isAdmin}
            <Button variant="secondary" size="sm" onclick={addRank} disabled={ranks.length >= MAX_RANKS}>
              <Plus class="h-3.5 w-3.5" />Add rank
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </Card>

  <Card>
    <SectionTitle icon={Snowflake} title="Gameplay" class="mb-4" />
    <SettingRow
      title="Freeze all transactions"
      hint="Stops every coin and item change: shop purchases, battle rewards and the rest. Turning it on pauses the economy without losing anything."
    >
      <div class="sm:flex sm:justify-end">
        <Toggle on={freeze} disabled={!isAdmin} label="Freeze all transactions" onclick={() => (freeze = !freeze)} />
      </div>
    </SettingRow>
  </Card>
</div>
