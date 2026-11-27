<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChipPicker from '$lib/components/ChipPicker.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import Input from '$lib/components/Input.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import ScrollPanel from '$lib/components/ScrollPanel.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import { api } from '$lib/api/endpoints';
  import type {
    InvasionAffinity,
    InvasionConfig,
    InvasionEmoji,
    InvasionItemMeta,
    InvasionRarity,
    InvasionShopResetType,
  } from '$lib/api/endpoints';
  import ItemConfigSkeleton from '$lib/modules/invasion/items/ItemConfigSkeleton.svelte';
  import { ITEM_CONFIG_SECTIONS, itemConfigSection, type ItemConfigSection } from '$lib/modules/invasion/items/item-config';
  import { EFFECT_DOMAIN_LABELS, EFFECT_TYPE_LABELS, familyLabel } from '$lib/modules/invasion/items/effect-labels';
  import { pageTone } from '$lib/nav';
  import { onlyDecimal, onlyDigits, restrictTo } from '$lib/utils/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, label, tile, toneText } from '$lib/ui';
  import { titleCase } from '$lib/utils/string';
  import { urlParam } from '$lib/utils/url-param';
  import { Boxes, Coins, Flame, Gift, Layers, Pencil, Plus, RefreshCw, Settings2, Smile, Sparkles, Trash2 } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import { onMount, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  let {
    guildId,
    isAdmin,
    meta,
    onChanged,
  }: {
    guildId: string;
    isAdmin: boolean;
    meta: InvasionItemMeta | null;
    onChanged: (meta: InvasionItemMeta) => void;
  } = $props();

  type Kind = 'rarity' | 'affinity';
  type Section = ItemConfigSection;

  const tone = pageTone();

  const SHOP_RESET_LABELS: Record<InvasionShopResetType, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  const SHOP_RESET_OPTIONS = (Object.keys(SHOP_RESET_LABELS) as InvasionShopResetType[]).map(value => ({
    value,
    label: SHOP_RESET_LABELS[value],
  }));

  type EmojiDraft = { raw: string; raw_disabled: string; discord: string; discord_disabled: string };
  const emptyEmoji = (): EmojiDraft => ({ raw: '', raw_disabled: '', discord: '', discord_disabled: '' });
  const emojiToDraft = (emoji: InvasionEmoji | null | undefined): EmojiDraft => ({
    raw: emoji?.raw ?? '',
    raw_disabled: emoji?.raw_disabled ?? '',
    discord: emoji?.discord ?? '',
    discord_disabled: emoji?.discord_disabled ?? '',
  });
  const draftToEmoji = (draft: EmojiDraft): Partial<InvasionEmoji> => ({
    raw: draft.raw.trim() || null,
    raw_disabled: draft.raw_disabled.trim() || null,
    discord: draft.discord.trim() || null,
    discord_disabled: draft.discord_disabled.trim() || null,
  });

  // The open section is `?config=general|rarity|affinity|effect`, so a reload, Back and a link open the same one.
  // `general` must never be the fallback, or picking it would drop the param and close the view in the Items tab.
  const sectionParam = urlParam('config');
  const active = $derived(sectionParam.value || 'general');
  // The open form is the row id while editing, or `new:<kind>` while adding.
  const metaParam = urlParam('meta');

  const rarities = $derived(meta?.rarities ?? []);
  // Base elements first, then the combined ones, each alphabetical.
  const affinities = $derived(
    [...(meta?.affinities ?? [])].sort(
      (a, b) => (a.composite.length ? 1 : 0) - (b.composite.length ? 1 : 0) || a.name.localeCompare(b.name),
    ),
  );
  const effects = $derived(meta?.effects ?? []);
  const baseChips = $derived(
    affinities
      .filter(affinity => affinity.id !== editId && affinity.composite.length === 0)
      .map(affinity => ({ id: affinity.id, name: titleCase(affinity.name) })),
  );
  const glyph = (emoji: InvasionEmoji | null | undefined) => emoji?.raw || emoji?.discord || '';
  const affinityName = (id: string) => affinities.find(affinity => affinity.id === id)?.name ?? '?';
  // The transaction defaults a rarity seeds a new item with, always the same four slots so the
  // inline columns line up from one rarity to the next; `value` is empty when it is left unset.
  const rarityDefaults = (row: InvasionRarity): { label: string; value: string; icon: Component }[] => [
    { label: 'Price', value: row.default_shop_price ? String(row.default_shop_price) : '', icon: Coins },
    { label: 'Stock', value: row.default_shop_stocks !== null ? String(row.default_shop_stocks) : '', icon: Boxes },
    { label: 'Restock', value: row.default_shop_reset ? SHOP_RESET_LABELS[row.default_shop_reset] : '', icon: RefreshCw },
    { label: 'Reward', value: row.default_reward_chance ? `${row.default_reward_chance}%` : '', icon: Gift },
  ];

  let mode: 'new' | 'edit' | null = $state(null);
  let editKind: Kind | null = $state(null);
  let editId: string | null = $state(null);
  let saving = $state(false);
  let removeTarget: { kind: Kind; id: string; name: string } | null = $state(null);
  let removing = $state(false);

  let emoji = $state<EmojiDraft>(emptyEmoji());

  let rName = $state('');
  let rLevel = $state('1');
  let rShopPrice = $state('0');
  let rShopStocks = $state('');
  let rShopReset = $state('');
  let rRewardChance = $state('0');

  let aName = $state('');
  let aComposite: string[] = $state([]);

  // General: the config carries the alias threshold; the rest of the config is sent back untouched.
  let config = $state<InvasionConfig | null>(null);
  let threshold = $state('');
  let savingGeneral = $state(false);
  const generalDirty = $derived(config ? (Number(threshold) || 0) !== config.alias_threshold : false);

  const isOpen = (kind: Kind, id: string) => mode === 'edit' && editKind === kind && editId === id;

  onMount(async () => {
    try {
      const next = await api.invasion.config(guildId);
      config = next;
      threshold = String(next.alias_threshold);
    } catch (e: any) {
      toast('error', e.reason?.message ?? e.message ?? 'Could not load the item settings');
    }
  });

  function closeForm() {
    mode = null;
    editKind = null;
    editId = null;
    metaParam.value = '';
  }

  function openRarityNew() {
    mode = 'new';
    editKind = 'rarity';
    editId = null;
    rName = '';
    rLevel = String(Math.max(1, ...rarities.map(rarity => rarity.level)) + 1);
    rShopPrice = '0';
    rShopStocks = '';
    rShopReset = '';
    rRewardChance = '0';
    emoji = emptyEmoji();
    metaParam.value = 'new:rarity';
  }

  function openRarity(row: InvasionRarity) {
    mode = 'edit';
    editKind = 'rarity';
    editId = row.id;
    rName = row.name;
    rLevel = String(row.level);
    rShopPrice = String(row.default_shop_price);
    rShopStocks = row.default_shop_stocks === null ? '' : String(row.default_shop_stocks);
    rShopReset = row.default_shop_reset ?? '';
    rRewardChance = String(row.default_reward_chance);
    emoji = emojiToDraft(row.emoji);
    metaParam.value = row.id;
  }

  function openAffinityNew() {
    mode = 'new';
    editKind = 'affinity';
    editId = null;
    aName = '';
    aComposite = [];
    emoji = emptyEmoji();
    metaParam.value = 'new:affinity';
  }

  function openAffinity(row: InvasionAffinity) {
    mode = 'edit';
    editKind = 'affinity';
    editId = row.id;
    aName = row.name;
    aComposite = [...row.composite];
    emoji = emojiToDraft(row.emoji);
    metaParam.value = row.id;
  }

  // Moving to another section closes whatever was being edited.
  let lastSection = untrack(() => sectionParam.value);
  $effect(() => {
    if (sectionParam.value !== lastSection) {
      lastSection = sectionParam.value;
      if (mode) closeForm();
    }
  });

  // The address says what is open, so a reload, Back and a link open the same form.
  // Reads `meta` outside `untrack`, so the effect runs again once the definitions arrive.
  $effect(() => {
    const wanted = metaParam.value;
    const known = meta;
    untrack(() => {
      if (!known) return;
      if (!wanted) {
        if (mode) {
          mode = null;
          editKind = null;
          editId = null;
        }
        return;
      }
      if (wanted.startsWith('new:')) {
        const kind = wanted.slice(4) as Kind;
        if (isAdmin && !(mode === 'new' && editKind === kind)) {
          if (kind === 'rarity') openRarityNew();
          else openAffinityNew();
        }
        return;
      }
      if (mode === 'edit' && editId === wanted) return;

      const rarity = rarities.find(row => row.id === wanted);
      if (rarity) return openRarity(rarity);
      const affinity = affinities.find(row => row.id === wanted);
      if (affinity) openAffinity(affinity);
    });
  });

  async function refresh() {
    const next = await api.invasion.itemMeta(guildId);
    onChanged(next);
  }

  async function saveGeneral() {
    if (!config || savingGeneral) return;
    savingGeneral = true;
    try {
      const next = await api.invasion.saveConfig(guildId, {
        channel_type: config.channel_type,
        channel_id: config.channel_id,
        active_tag_id: config.active_tag_id,
        levelling_mode: config.levelling_mode,
        level_roles: config.level_roles,
        participant_role_id: config.participant_role_id,
        freeze_transactions: config.freeze_transactions,
        alias_threshold: Number(threshold) || 0,
      });
      config = next;
      threshold = String(next.alias_threshold);
      toast('success', 'Saved');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingGeneral = false;
    }
  }

  async function save() {
    if (saving) return;
    saving = true;
    try {
      if (editKind === 'rarity') {
        const input = {
          name: rName.trim(),
          level: Number(rLevel) || 1,
          emoji: draftToEmoji(emoji),
          default_shop_price: Number(rShopPrice) || 0,
          default_shop_stocks: rShopStocks === '' ? null : Number(rShopStocks),
          default_shop_reset: (rShopReset || null) as InvasionShopResetType | null,
          default_reward_chance: Number(rRewardChance) || 0,
        };
        if (editId) await api.invasion.updateRarity(guildId, editId, input);
        else await api.invasion.createRarity(guildId, input);
        toast('success', editId ? 'Rarity saved' : 'Rarity added');
      } else {
        const input = { name: aName.trim(), composite: aComposite, emoji: draftToEmoji(emoji) };
        if (editId) await api.invasion.updateAffinity(guildId, editId, input);
        else await api.invasion.createAffinity(guildId, input);
        toast('success', editId ? 'Element saved' : 'Element added');
      }
      await refresh();
      closeForm();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!removeTarget) return;
    removing = true;
    try {
      const { kind, id } = removeTarget;
      if (kind === 'rarity') await api.invasion.removeRarity(guildId, id);
      else await api.invasion.removeAffinity(guildId, id);
      const wasOpen = editId === id;
      removeTarget = null;
      await refresh();
      if (wasOpen) closeForm();
      toast('success', 'Removed');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      removing = false;
    }
  }
</script>

{#snippet emojiFields()}
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <span class={label}>Emoji</span>
      <Input bind:value={emoji.raw} maxlength={64} placeholder="Fill the emoji" aria-label="Emoji" />
    </div>
    <div>
      <span class={label}>Emoji (off)</span>
      <Input bind:value={emoji.raw_disabled} maxlength={64} placeholder="Fill the emoji" aria-label="Emoji disabled" />
    </div>
    <div>
      <span class={label}>Discord emoji</span>
      <Input bind:value={emoji.discord} maxlength={64} placeholder="<:name:id>" aria-label="Discord emoji" />
    </div>
    <div>
      <span class={label}>Discord emoji (off)</span>
      <Input bind:value={emoji.discord_disabled} maxlength={64} aria-label="Discord emoji disabled" />
    </div>
  </div>
{/snippet}

{#snippet formActions(saveLabel: string, valid: boolean)}
  <div class="mt-4 flex justify-end gap-2">
    <Button variant="ghost" onclick={closeForm}>Cancel</Button>
    <Button variant="primary" onclick={save} disabled={saving || !valid}>{saving ? 'Saving…' : saveLabel}</Button>
  </div>
{/snippet}

{#snippet rarityFields()}
  <div class="mt-4">
    <div class="flex items-center gap-2">
      <Settings2 class="h-4 w-4 {toneText[tone()]}" />
      <p class="{caps} text-zinc-300">General</p>
    </div>
    <p class="mt-1 text-xs text-zinc-500">The name and level this rarity is shown with.</p>
    <div class="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <span class={label}>Name</span>
        <Input bind:value={rName} maxlength={50} placeholder="C" aria-label="Rarity name" />
      </div>
      <div>
        <span class={label}>Level</span>
        <Input
          bind:value={rLevel}
          inputmode="numeric"
          maxlength={3}
          aria-label="Rarity level"
          oninput={restrictTo(onlyDigits, v => (rLevel = v))}
        />
      </div>
    </div>
  </div>

  <div class="mt-4 border-t border-zinc-800/40 pt-4">
    <div class="flex items-center gap-2">
      <Coins class="h-4 w-4 {toneText[tone()]}" />
      <p class="{caps} text-zinc-300">Shop defaults</p>
    </div>
    <p class="mt-1 text-xs text-zinc-500">What a new item of this rarity starts with. An item can still override them.</p>
    <div class="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <span class={label}>Shop price</span>
        <Input
          bind:value={rShopPrice}
          inputmode="numeric"
          maxlength={9}
          aria-label="Default shop price"
          oninput={restrictTo(onlyDigits, v => (rShopPrice = v))}
        />
      </div>
      <div>
        <span class={label}>Shop stock</span>
        <Input
          bind:value={rShopStocks}
          inputmode="numeric"
          maxlength={5}
          placeholder="Unlimited"
          aria-label="Default shop stocks"
          oninput={restrictTo(onlyDigits, v => (rShopStocks = v))}
        />
      </div>
      <div>
        <span class={label}>Restock</span>
        <Select bind:value={rShopReset} options={SHOP_RESET_OPTIONS} placeholder="Never" label="Default shop restock" class="w-full" />
      </div>
      <div>
        <span class={label}>Reward chance (%)</span>
        <Input
          bind:value={rRewardChance}
          inputmode="decimal"
          maxlength={5}
          aria-label="Default reward chance"
          oninput={restrictTo(onlyDecimal, v => (rRewardChance = v))}
        />
      </div>
    </div>
  </div>

  <div class="mt-4 border-t border-zinc-800/40 pt-4">
    <div class="flex items-center gap-2">
      <Smile class="h-4 w-4 {toneText[tone()]}" />
      <p class="{caps} text-zinc-300">Emoji</p>
    </div>
    <div class="mt-3">{@render emojiFields()}</div>
  </div>
{/snippet}

{#snippet affinityFields()}
  <div class="grid gap-4">
    <div>
      <span class={label}>Name</span>
      <Input bind:value={aName} maxlength={50} placeholder="Fire" aria-label="Element name" />
    </div>
    <div>
      <span class={label}>Built from</span>
      <ChipPicker
        items={baseChips}
        selected={aComposite}
        onchange={next => (aComposite = next)}
        placeholder="Add base elements..."
        label="Base elements"
      />
    </div>
  </div>
  <p class="mt-1.5 text-xs text-zinc-500">Leave it empty to make a base element. A combined element is built from base elements only.</p>
  <div class="mt-4">{@render emojiFields()}</div>
{/snippet}

<div class="grid items-start gap-3 lg:grid-cols-[17rem_1fr]">
  <Card>
    <nav class="space-y-1.5" aria-label="Item configuration">
      {#each ITEM_CONFIG_SECTIONS as section (section.id)}
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {active === section.id
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
          onclick={() => (sectionParam.value = section.id)}
        >
          <section.icon class="h-4 w-4 shrink-0 {active === section.id ? toneText[tone()] : ''}" />
          {section.label}
        </button>
      {/each}
    </nav>
  </Card>

  <div>
    {#if active === 'general'}
      {#if !config}
        <ItemConfigSkeleton section="general" {isAdmin} />
      {:else}
        <Card>
          <SectionTitle icon={Settings2} title={itemConfigSection('general').label} />
          <p class="mt-1 text-xs text-zinc-500">{itemConfigSection('general').description}</p>

          <div class="mt-4">
            <div class="divide-y divide-zinc-800/40">
              <SettingRow
                title="Name & Alias Similarity Threshold"
                hint="How close a typed name must be to an item's name or alias, from 0 to 1. Higher forgives more typos, 0 matches exactly."
              >
                <div class="sm:flex sm:justify-end">
                  <div class="w-32 sm:w-40">
                    <Input
                      bind:value={threshold}
                      inputmode="decimal"
                      maxlength={4}
                      placeholder="0"
                      aria-label="Name & Alias Similarity Threshold"
                      oninput={restrictTo(onlyDecimal, value => (threshold = value))}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </SettingRow>
            </div>
            <div class="mt-5 flex justify-end">
              <SaveButton saving={savingGeneral} disabled={!isAdmin || !generalDirty} onclick={saveGeneral} />
            </div>
          </div>
        </Card>
      {/if}
    {:else if active === 'rarity'}
      {#if !meta}
        <ItemConfigSkeleton section="rarity" {isAdmin} />
      {:else}
        <Card>
          <div class="flex items-start justify-between gap-2">
            <SectionTitle icon={Layers} title={itemConfigSection('rarity').label} />
            {#if isAdmin}
              <Button
                variant="soft"
                size="icon"
                onclick={() => (mode === 'new' && editKind === 'rarity' ? closeForm() : openRarityNew())}
                aria-label="Add rarity"
                title="Add rarity"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
            {/if}
          </div>
          <p class="mt-1 text-xs text-zinc-500">{itemConfigSection('rarity').description}</p>

          {#if mode === 'new' && editKind === 'rarity'}
            <div class="mt-4" transition:slide={{ duration: 220, easing: cubicOut }}>
              <div class="rounded-xl bg-zinc-800/20 p-3 ring-1 ring-zinc-800/60">
                <SectionTitle icon={Plus} title="Add a rarity" class="mb-3" />
                {@render rarityFields()}
                {@render formActions('Add rarity', rName.trim().length > 0)}
              </div>
            </div>
          {/if}

          <ScrollPanel class="mt-4 max-h-[calc(100vh-20rem)] space-y-2" hideHint={mode !== null && editKind === 'rarity'}>
            {#if !rarities.length}
              <p class="text-xs text-zinc-500">No rarities yet. Add one to organise items by tier.</p>
            {:else}
              {#each rarities as row (row.id)}
                {@const stats = rarityDefaults(row)}
                <div class="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800/60">
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                    <div class="flex min-w-0 items-center gap-2">
                      <span class="truncate text-sm font-medium text-zinc-200">{row.name}</span>
                      <Badge tone="neutral">Level {row.level}</Badge>
                    </div>
                    <div class="grid w-full grid-cols-2 gap-x-4 gap-y-1 sm:ml-auto sm:w-auto sm:grid-cols-[4rem_3rem_5rem_4rem]">
                      {#each stats as stat (stat.label)}
                        <span class="inline-flex items-center gap-1.5 whitespace-nowrap" title={stat.label}>
                          <stat.icon class="h-3.5 w-3.5 shrink-0 {stat.value ? 'text-zinc-400' : 'text-zinc-600'}" />
                          <span class="text-[11px] {stat.value ? 'text-zinc-300' : 'text-zinc-600'}">{stat.value || '-'}</span>
                        </span>
                      {/each}
                    </div>
                    {#if isAdmin}
                      <div class="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => (isOpen('rarity', row.id) ? closeForm() : openRarity(row))}
                          aria-label="Edit {row.name}"
                        >
                          <Pencil class="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => (removeTarget = { kind: 'rarity', id: row.id, name: row.name })}
                          aria-label="Remove {row.name}"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    {/if}
                  </div>
                  {#if isOpen('rarity', row.id)}
                    <div class="border-t border-zinc-800/50 p-3" transition:slide={{ duration: 220, easing: cubicOut }}>
                      {@render rarityFields()}
                      {@render formActions('Save changes', rName.trim().length > 0)}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </ScrollPanel>
        </Card>
      {/if}
    {:else if active === 'affinity'}
      {#if !meta}
        <ItemConfigSkeleton section="affinity" {isAdmin} />
      {:else}
        <Card>
          <div class="flex items-start justify-between gap-2">
            <SectionTitle icon={Flame} title={itemConfigSection('affinity').label} />
            {#if isAdmin}
              <Button
                variant="soft"
                size="icon"
                onclick={() => (mode === 'new' && editKind === 'affinity' ? closeForm() : openAffinityNew())}
                aria-label="Add element"
                title="Add element"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
            {/if}
          </div>
          <p class="mt-1 text-xs text-zinc-500">{itemConfigSection('affinity').description}</p>

          {#if mode === 'new' && editKind === 'affinity'}
            <div class="mt-4" transition:slide={{ duration: 220, easing: cubicOut }}>
              <div class="rounded-xl bg-zinc-800/20 p-3 ring-1 ring-zinc-800/60">
                <SectionTitle icon={Plus} title="Add an element" class="mb-3" />
                {@render affinityFields()}
                {@render formActions('Add element', aName.trim().length > 0)}
              </div>
            </div>
          {/if}

          <ScrollPanel class="mt-4 max-h-[calc(100vh-20rem)] space-y-2" hideHint={mode !== null && editKind === 'affinity'}>
            {#if !affinities.length}
              <p class="text-xs text-zinc-500">No elements yet. Add one to attune items to.</p>
            {:else}
              {#each affinities as row (row.id)}
                <div class="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800/60">
                  <div class="flex items-center gap-3 px-3 py-2.5">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-zinc-200">{titleCase(row.name)}</p>
                      <p class="mt-0.5 truncate text-xs text-zinc-500">
                        {row.composite.length ? `Built from ${row.composite.map(affinityName).map(titleCase).join(' + ')}` : 'Base element'}
                      </p>
                    </div>
                    {#if isAdmin}
                      <div class="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => (isOpen('affinity', row.id) ? closeForm() : openAffinity(row))}
                          aria-label="Edit {row.name}"
                        >
                          <Pencil class="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => (removeTarget = { kind: 'affinity', id: row.id, name: row.name })}
                          aria-label="Remove {row.name}"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    {/if}
                  </div>
                  {#if isOpen('affinity', row.id)}
                    <div class="border-t border-zinc-800/50 p-3" transition:slide={{ duration: 220, easing: cubicOut }}>
                      {@render affinityFields()}
                      {@render formActions('Save changes', aName.trim().length > 0)}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </ScrollPanel>
        </Card>
      {/if}
    {:else}
      {#if !meta}
        <ItemConfigSkeleton section="effect" {isAdmin} />
      {:else}
        <Card>
          <SectionTitle icon={Sparkles} title={itemConfigSection('effect').label} />
          <p class="mt-1 text-xs text-zinc-500">{itemConfigSection('effect').description}</p>

          <ScrollPanel class="mt-4 max-h-[calc(100vh-20rem)]">
            {#if !effects.length}
              <p class="text-xs text-zinc-500">No effects are defined.</p>
            {:else}
              <div class="overflow-hidden rounded-xl ring-1 ring-zinc-800/60">
                <div class="grid gap-x-4 bg-zinc-800/30 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                  <span class="{caps} text-zinc-400">Effect</span>
                  <span class="{caps} text-zinc-400">Type</span>
                  <span class="{caps} text-zinc-400">Domain</span>
                </div>
                <div class="divide-y divide-zinc-800/40">
                  {#each effects as row (row.id)}
                    <div class="grid items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                      <div class="min-w-0">
                        <p class="flex items-center gap-2 text-sm font-medium text-zinc-200">
                          {#if glyph(row.emoji)}<span>{glyph(row.emoji)}</span>{/if}<span class="truncate">{titleCase(row.name)}</span>
                        </p>
                        <p class="mt-0.5 truncate text-xs text-zinc-500">
                          {row.description || 'No description'}
                          {#if row.default_turns !== null}· {row.default_turns === 0 ? 'Permanent' : `${row.default_turns} turns`}{/if}
                          {#if row.families.length}· {row.families.map(familyLabel).join(', ')}{/if}
                        </p>
                      </div>
                      <div><Badge tone="neutral">{EFFECT_TYPE_LABELS[row.type]}</Badge></div>
                      <div><Badge tone="info">{EFFECT_DOMAIN_LABELS[row.domain]}</Badge></div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </ScrollPanel>
        </Card>
      {/if}
    {/if}
  </div>
</div>

<ConfirmModal
  show={!!removeTarget}
  title="Remove {removeTarget?.name ?? 'this'}?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={removing}
  onConfirm={remove}
  onClose={() => (removeTarget = null)}
>
  It disappears from the item editor. One still used by an item or another element cannot be removed until those are changed.
</ConfirmModal>
