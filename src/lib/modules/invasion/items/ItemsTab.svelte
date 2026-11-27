<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Combobox from '$lib/components/Combobox.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import RadarChart from '$lib/components/RadarChart.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { api } from '$lib/api/endpoints';
  import ItemConfig from '$lib/modules/invasion/items/ItemConfig.svelte';
  import { EFFECT_TYPE_LABELS } from '$lib/modules/invasion/items/effect-labels';
  import type {
    DiscordRole,
    InvasionEffectValueType,
    InvasionItem,
    InvasionItemInput,
    InvasionItemMeta,
    InvasionItemType,
    InvasionRequirement,
    InvasionShopResetType,
  } from '$lib/api/endpoints';
  import { onlyDecimal, onlyDigits, restrictTo } from '$lib/utils/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, control, label, td, th, tile, toneText, type Tone } from '$lib/ui';
  import { titleCase } from '$lib/utils/string';
  import { urlNumber, urlParam } from '$lib/utils/url-param';
  import { pageTone } from '$lib/nav';
  import {
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Coins,
    Eye,
    GitCompareArrows,
    Info,
    Pencil,
    Plus,
    Search,
    Settings2,
    SlidersHorizontal,
    Swords,
    Trash2,
    X,
  } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  // The requirement editor's own tree, so a group can hold conditions and further groups the way the
  // stored `InvasionRequirement[]` allows. `id` is only for keyed rendering, it is not sent.
  type ReqNode =
    | { id: string; kind: 'leaf'; type: 'role' | 'item'; value: string }
    | { id: string; kind: 'group'; type: 'and' | 'or'; children: ReqNode[] };
  let reqSeq = 0;
  const reqId = () => `req-${++reqSeq}`;
  const KIND_OPTIONS = [
    { value: 'role', label: 'Role' },
    { value: 'item', label: 'Item' },
  ];
  const OPERATOR_OPTIONS = [
    { id: 'and', label: 'And' },
    { id: 'or', label: 'Or' },
  ];

  const TYPE_LABELS: Record<InvasionItemType, string> = {
    consumable: 'Consumable',
    technique: 'Technique',
    tool: 'Tool',
    material: 'Material',
  };
  const TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as InvasionItemType[]).map(value => ({ value, label: TYPE_LABELS[value] }));
  const VALUE_TYPES: { value: InvasionEffectValueType; label: string }[] = [
    { value: 'number', label: 'Number' },
    { value: 'percent', label: 'Percent' },
    { value: 'multiplier', label: 'Multiplier' },
  ];
  const RESET_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];
  // The item form is split so only one group of fields shows at a time.
  const FORM_TABS = [
    { id: 'general', label: 'General', icon: Info },
    { id: 'battle', label: 'Battle Props', icon: Swords },
    { id: 'transaction', label: 'Transaction Props', icon: Coins },
  ];
  const RARITY_TONES = ['neutral', 'info', 'emerald', 'cyan', 'sky', 'violet', 'fuchsia', 'amber', 'orange', 'red'];
  const MAX_ALIASES = 20;
  // How many items can be on the radar at once: the inspected item plus the compared ones.
  const MAX_COMPARE = 5;

  const pageParam = urlNumber('page', 1);
  const limitParam = urlNumber('limit', 10);
  const configParam = urlParam('config');
  // The inspected item (shown in the side panel) and the one being edited (its row expands).
  const inspectParam = urlParam('item');
  const editParam = urlParam('edit');
  const compareParam = urlParam('compare');
  // Which group of fields the open form shows (General, Battle Props, Transaction Props).
  const formParam = urlParam('form', 'general');

  // Filters. The whole list is filtered from the address, so a reload or a link keeps the same view.
  const qFilter = urlParam('q');
  const rarityFilter = urlParam('rarity');
  const elementFilter = urlParam('element');
  const typeFilter = urlParam('type');
  const saleFilter = urlParam('sale');
  const rewardFilter = urlParam('reward');
  const starterFilter = urlParam('starter');
  const priceMinFilter = urlParam('pmin');
  const priceMaxFilter = urlParam('pmax');
  const powerMinFilter = urlParam('powmin');
  const powerMaxFilter = urlParam('powmax');

  let items: InvasionItem[] | null = $state(null);
  let defs: InvasionItemMeta | null = $state(null);
  let roles: DiscordRole[] = $state([]);

  let editingId: string | null = $state(null);
  let saving = $state(false);
  let removeTarget: InvasionItem | null = $state(null);
  let removing = $state(false);

  // The form, for a new item or the one being edited.
  let name = $state('');
  let key = $state('');
  let keyTouched = $state(false);
  let description = $state('');
  let rarityId = $state('');
  let itemType = $state<InvasionItemType>('consumable');
  let affinityId = $state('');
  let price = $state('0');
  let cooldown = $state('0');
  let manaCost = $state('0');
  let accuracy = $state('100');
  let aliases: string[] = $state([]);
  let aliasInput = $state('');
  let effects: { effect_id: string; value: string; value_type: InvasionEffectValueType; lasting_turns: string }[] = $state([]);
  let requirementTree: ReqNode[] = $state([]);
  let purchasable = $state(false);
  let rewardable = $state(false);
  let starter = $state(false);
  let shopStocks = $state('');
  let shopReset = $state('');
  let rewardChance = $state('0');

  const cell = td.replace('h-11', 'h-14');
  // Read through a function so the declared types apply: a value assigned only inside a callback is
  // narrowed to its initial `null` at the top level otherwise.
  const allItems = (): InvasionItem[] => items ?? [];
  const defsOrNull = (): InvasionItemMeta | null => defs;
  const adding = $derived(editParam.value === 'new' && !editingId);
  const rarityOf = (id: string | null) => defs?.rarities.find(rarity => rarity.id === id) ?? null;
  const affinityOf = (id: string | null) => defs?.affinities.find(affinity => affinity.id === id) ?? null;
  const effectOf = (id: string) => defs?.effects.find(effect => effect.id === id) ?? null;
  const glyph = (emoji: { raw: string | null; discord: string | null } | undefined | null) => emoji?.raw || emoji?.discord || '';

  const rarityTone = (id: string | null): 'neutral' | Tone => {
    const index = defs?.rarities.findIndex(rarity => rarity.id === id) ?? -1;
    return RARITY_TONES[Math.min(Math.max(index, 0), RARITY_TONES.length - 1)] as 'neutral' | Tone;
  };

  const rarityOptions = $derived((defsOrNull()?.rarities ?? []).map(rarity => ({ value: rarity.id, label: rarity.name })));
  const affinityOptions = $derived(
    (defsOrNull()?.affinities ?? []).map(affinity => ({ value: affinity.id, label: titleCase(affinity.name) })),
  );
  const effectOptions = $derived((defsOrNull()?.effects ?? []).map(effect => ({ value: effect.id, label: titleCase(effect.name) })));
  const itemKeyOptions = $derived(
    allItems()
      .filter(item => item.id !== editingId)
      .map(item => ({ value: item.key, label: item.name })),
  );

  // Comparison stats, worked out from the item's effects so they stay right as effects change.
  // Burst is the instant power, buff and debuff the summed buff/debuff power, and the two
  // efficiencies spread the total power over the mana cost and the cooldown. Accuracy is the
  // item's own hit chance.
  function statsOf(item: InvasionItem) {
    let burst = 0;
    let buff = 0;
    let debuff = 0;
    for (const ref of item.effects) {
      const definition = effectOf(ref.effect_id);
      if (!definition) continue;
      const value = Math.abs(ref.value);
      if (definition.type === 'instant_self' || definition.type === 'instant_target') burst += value;
      else if (definition.type === 'buff') buff += value;
      else if (definition.type === 'debuff') debuff += value;
    }
    const total = burst + buff + debuff;
    return {
      burst,
      buff,
      debuff,
      total,
      accuracy: item.accuracy,
      cost: total / Math.max(item.mana_cost, 1),
      cooldown: total / Math.max(item.cooldown, 1),
    };
  }

  const inspected = $derived(allItems().find(item => item.id === inspectParam.value) ?? null);
  // The comparison holds up to `MAX_COMPARE` items: the inspected item plus the ones picked with the
  // compare icon, kept in the address as a comma-separated list.
  const comparedIds = $derived(compareParam.value ? compareParam.value.split(',').filter(Boolean) : []);
  const comparedItems = $derived(
    comparedIds.map(id => allItems().find(item => item.id === id)).filter((item): item is InvasionItem => Boolean(item)),
  );

  const filtered = $derived.by(() => {
    const term = qFilter.value.trim().toLowerCase();
    const minPrice = priceMinFilter.value === '' ? null : Number(priceMinFilter.value);
    const maxPrice = priceMaxFilter.value === '' ? null : Number(priceMaxFilter.value);
    const minPower = powerMinFilter.value === '' ? null : Number(powerMinFilter.value);
    const maxPower = powerMaxFilter.value === '' ? null : Number(powerMaxFilter.value);
    return allItems().filter(item => {
      if (rarityFilter.value && item.rarity_id !== rarityFilter.value) return false;
      if (elementFilter.value && item.affinity_id !== elementFilter.value) return false;
      if (typeFilter.value && item.type !== typeFilter.value) return false;
      if (saleFilter.value === '1' && !item.is_purchasable) return false;
      if (rewardFilter.value === '1' && !item.is_rewardable) return false;
      if (starterFilter.value === '1' && !item.is_starter) return false;
      if (minPrice !== null && item.price < minPrice) return false;
      if (maxPrice !== null && item.price > maxPrice) return false;
      if (minPower !== null && statsOf(item).total < minPower) return false;
      if (maxPower !== null && statsOf(item).total > maxPower) return false;
      if (term && ![item.name, item.key, ...item.aliases].join(' ').toLowerCase().includes(term)) return false;
      return true;
    });
  });

  const page = $derived(pageParam.value);
  const limit = $derived(limitParam.value);
  const matched = $derived(filtered.length);
  const total = $derived(allItems().length);
  const paged = $derived(filtered.slice((page - 1) * limit, page * limit));
  const filtering = $derived(
    Boolean(
      qFilter.value ||
      rarityFilter.value ||
      elementFilter.value ||
      typeFilter.value ||
      saleFilter.value ||
      rewardFilter.value ||
      starterFilter.value ||
      priceMinFilter.value ||
      priceMaxFilter.value ||
      powerMinFilter.value ||
      powerMaxFilter.value,
    ),
  );

  const FILTER_PARAMS = [
    qFilter,
    rarityFilter,
    elementFilter,
    typeFilter,
    saleFilter,
    rewardFilter,
    starterFilter,
    priceMinFilter,
    priceMaxFilter,
    powerMinFilter,
    powerMaxFilter,
  ];

  function setFilter(param: { value: string }, value: string) {
    if (param.value === value) return;
    param.value = value;
    pageParam.value = 1;
  }

  function toggleFilter(param: { value: string }, on: boolean) {
    param.value = on ? '1' : '';
    pageParam.value = 1;
  }

  function clearFilters() {
    for (const param of FILTER_PARAMS) param.value = '';
    pageParam.value = 1;
  }

  function inspect(item: InvasionItem) {
    inspectParam.value = item.id;
    compareParam.value = '';
  }

  function toggleInspect(item: InvasionItem) {
    if (inspectParam.value === item.id) {
      inspectParam.value = '';
      compareParam.value = '';
    } else {
      inspect(item);
    }
  }

  // The compare icon adds the row to the comparison set (the inspected item plus up to four others).
  // On the inspected row it cancels the inspection, promoting the first compared item so the panel stays.
  function toggleCompare(item: InvasionItem) {
    const ids = comparedIds;
    if (ids.includes(item.id)) {
      compareParam.value = ids.filter(id => id !== item.id).join(',');
      return;
    }
    if (inspectParam.value === item.id) {
      const [first, ...rest] = ids;
      inspectParam.value = first ?? '';
      compareParam.value = rest.join(',');
      return;
    }
    if (!inspectParam.value) {
      inspectParam.value = item.id;
      compareParam.value = '';
      return;
    }
    if (ids.length >= MAX_COMPARE - 1) return;
    compareParam.value = [...ids, item.id].join(',');
  }

  const tone = pageTone();
  // The inspected item keeps the page tone; the compared ones cycle through a fixed palette so every
  // line on the radar and every value in the table keeps the same color.
  const COMPARE_PALETTE: Tone[] = ['sky', 'violet', 'emerald', 'amber', 'fuchsia', 'cyan', 'lime'];
  const comparePalette = $derived(COMPARE_PALETTE.filter(value => value !== tone()));
  const compareEntries = $derived.by(() => {
    const entries: { id: string; item: InvasionItem; tone: Tone }[] = [];
    if (inspected) entries.push({ id: inspected.id, item: inspected, tone: tone() });
    comparedItems.forEach((item, i) => entries.push({ id: item.id, item, tone: comparePalette[i % comparePalette.length] }));
    return entries;
  });
  function compareTone(id: string): Tone | null {
    if (id === inspectParam.value) return tone();
    const index = comparedIds.indexOf(id);
    return index < 0 ? null : comparePalette[index % comparePalette.length];
  }

  const RADAR_AXES = ['Burst', 'Buff', 'Debuff', 'Accuracy', 'Cost\nEfficiency', 'CD\nEfficiency'];
  const radarValues = (item: InvasionItem) => {
    const stats = statsOf(item);
    return [stats.burst, stats.buff, stats.debuff, stats.accuracy, stats.cost, stats.cooldown];
  };
  // Each axis is scaled against the largest value any item has on it, so the shapes stay comparable
  // between one inspection and the next.
  const radarMax = $derived.by(() => {
    const max = RADAR_AXES.map(() => 0);
    for (const item of allItems()) {
      radarValues(item).forEach((value, i) => {
        if (value > max[i]) max[i] = value;
      });
    }
    return max.map(value => (value > 0 ? value : 1));
  });
  const radarSeries = $derived(
    compareEntries.map(entry => ({ label: entry.item.name, values: radarValues(entry.item), tone: entry.tone })),
  );

  const formatNumber = (value: number) => (Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10));

  function metricsOf(item: InvasionItem) {
    const stats = statsOf(item);
    return [
      { label: 'Burst power', value: formatNumber(stats.burst), raw: stats.burst },
      { label: 'Buff power', value: formatNumber(stats.buff), raw: stats.buff },
      { label: 'Debuff power', value: formatNumber(stats.debuff), raw: stats.debuff },
      { label: 'Accuracy', value: `${formatNumber(stats.accuracy)}%`, raw: stats.accuracy },
      { label: 'Cost efficiency', value: formatNumber(stats.cost), raw: stats.cost },
      { label: 'CD efficiency', value: formatNumber(stats.cooldown), raw: stats.cooldown },
    ];
  }

  // The comparison table: one row per stat, one value per item in the entry order, with the best value
  // on each numeric row highlighted. Rarity is a name, so it has no winner.
  const comparisonRows = $derived.by(() => {
    const entries = compareEntries;
    if (!entries.length) return [];
    const rows: { label: string; values: { text: string; tone: Tone; best: boolean }[] }[] = [
      {
        label: 'Rarity',
        values: entries.map(entry => ({ text: rarityOf(entry.item.rarity_id)?.name ?? '-', tone: entry.tone, best: false })),
      },
    ];
    metricsOf(entries[0].item).forEach((metric, i) => {
      const raws = entries.map(entry => metricsOf(entry.item)[i].raw);
      const top = Math.max(...raws);
      // A winner must stand alone: when two items tie on the top value, none of them is highlighted.
      const leaders = raws.filter(raw => raw === top).length;
      rows.push({
        label: metric.label,
        values: entries.map((entry, j) => ({
          text: metricsOf(entry.item)[i].value,
          tone: entry.tone,
          best: entries.length > 1 && top > 0 && leaders === 1 && raws[j] === top,
        })),
      });
    });
    return rows;
  });

  // Any filter change sends the list back to page 1, however the change was made (a control, Back, a link).
  const filterSignature = () => FILTER_PARAMS.map(param => param.value).join('|');
  let lastFilterSignature = untrack(filterSignature);
  $effect(() => {
    const signature = filterSignature();
    if (signature === lastFilterSignature) return;
    lastFilterSignature = signature;
    if (pageParam.value !== 1) pageParam.value = 1;
  });

  // The search box and the range fields keep a local draft and commit to the address a beat later, so
  // typing does not add one history step per keystroke.
  let searchText = $state(qFilter.value);
  let priceMinText = $state(priceMinFilter.value);
  let priceMaxText = $state(priceMaxFilter.value);
  let powerMinText = $state(powerMinFilter.value);
  let powerMaxText = $state(powerMaxFilter.value);
  let committing: ReturnType<typeof setTimeout>;
  function commitFilters() {
    clearTimeout(committing);
    committing = setTimeout(() => {
      if (qFilter.value !== searchText.trim()) setFilter(qFilter, searchText.trim());
      if (priceMinFilter.value !== priceMinText.trim()) setFilter(priceMinFilter, priceMinText.trim());
      if (priceMaxFilter.value !== priceMaxText.trim()) setFilter(priceMaxFilter, priceMaxText.trim());
      if (powerMinFilter.value !== powerMinText.trim()) setFilter(powerMinFilter, powerMinText.trim());
      if (powerMaxFilter.value !== powerMaxText.trim()) setFilter(powerMaxFilter, powerMaxText.trim());
    }, 300);
  }

  // The address is the source of truth: when it changes (a link, Back), the drafts follow.
  $effect(() => {
    searchText = qFilter.value;
    priceMinText = priceMinFilter.value;
    priceMaxText = priceMaxFilter.value;
    powerMinText = powerMinFilter.value;
    powerMaxText = powerMaxFilter.value;
  });

  // Until the key is edited by hand it follows the name: "Healing Herb" gives "healing-herb".
  $effect(() => {
    if (keyTouched || editingId) return;
    key = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  });

  // The address says what is open, so a reload, Back and a link open the same form.
  $effect(() => {
    const wanted = editParam.value;
    const current = items;
    const known = defs;
    untrack(() => {
      if (configParam.value) return;
      if (!known) return;
      if (wanted === 'new') {
        if (isAdmin && !adding) openCreate();
        return;
      }
      if (!wanted) {
        if (editingId) closeForm();
        return;
      }
      const row = current?.find(item => item.id === wanted);
      if (row && editingId !== row.id) openEdit(row);
    });
  });

  onMount(async () => {
    const [itemList, itemMeta, roleList] = await Promise.allSettled([
      api.invasion.items(guildId),
      api.invasion.itemMeta(guildId),
      api.roles(guildId),
    ]);
    if (itemList.status === 'fulfilled') items = itemList.value;
    else toast('error', itemList.reason?.message ?? 'Could not load the items');
    if (itemMeta.status === 'fulfilled') defs = itemMeta.value;
    else toast('error', itemMeta.reason?.message ?? 'Could not load the item options');
    if (roleList.status === 'fulfilled') roles = roleList.value;
  });

  async function reload() {
    items = await api.invasion.items(guildId);
  }

  function openCreate() {
    editingId = null;
    name = '';
    key = '';
    keyTouched = false;
    description = '';
    rarityId = defs?.rarities[0]?.id ?? '';
    itemType = 'consumable';
    affinityId = '';
    price = '0';
    cooldown = '0';
    manaCost = '0';
    accuracy = '100';
    aliases = [];
    aliasInput = '';
    effects = [];
    requirementTree = [];
    purchasable = false;
    rewardable = false;
    starter = false;
    shopStocks = '';
    shopReset = '';
    rewardChance = '0';
    applyRarityDefaults();
    editParam.value = 'new';
  }

  function openEdit(item: InvasionItem) {
    editingId = item.id;
    name = item.name;
    key = item.key;
    keyTouched = true;
    description = item.description ?? '';
    rarityId = item.rarity_id ?? defs?.rarities[0]?.id ?? '';
    itemType = item.type;
    affinityId = item.affinity_id ?? '';
    price = String(item.price);
    cooldown = String(item.cooldown);
    manaCost = String(item.mana_cost);
    accuracy = String(item.accuracy);
    aliases = [...item.aliases];
    aliasInput = '';
    effects = item.effects.map(effect => ({
      effect_id: effect.effect_id,
      value: String(effect.value),
      value_type: effect.value_type,
      lasting_turns: String(effect.lasting_turns ?? 1),
    }));
    requirementTree = fromStored(item.requirements);
    purchasable = item.is_purchasable;
    rewardable = item.is_rewardable;
    starter = item.is_starter;
    shopStocks = item.shop_stocks === null ? '' : String(item.shop_stocks);
    shopReset = item.shop_reset_type ?? '';
    rewardChance = String(item.reward_chance);
    editParam.value = item.id;
  }

  function closeForm() {
    editingId = null;
    formParam.value = 'general';
    editParam.value = '';
  }

  function toggle(item: InvasionItem) {
    if (editingId === item.id) closeForm();
    else openEdit(item);
  }

  function addAlias() {
    const alias = aliasInput.trim();
    if (!alias) return;
    if (aliases.some(existing => existing.toLowerCase() === alias.toLowerCase())) {
      aliasInput = '';
      return;
    }
    if (aliases.length >= MAX_ALIASES) {
      toast('error', `An item can have at most ${MAX_ALIASES} aliases`);
      return;
    }
    aliases = [...aliases, alias];
    aliasInput = '';
  }

  function removeAlias(index: number) {
    aliases = aliases.filter((_, i) => i !== index);
  }

  function addEffect() {
    const first = defs?.effects[0];
    if (!first) return;
    effects = [
      ...effects,
      {
        effect_id: first.id,
        value: String(first.default_value),
        value_type: first.default_value_type,
        lasting_turns: String(first.default_turns ?? 1),
      },
    ];
  }

  // Reordering changes the order the effects land in, so up/down swap the two neighbours.
  function moveEffect(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= effects.length) return;
    const copy = [...effects];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    effects = copy;
  }

  // The stored requirement tree holds role and item leaves plus and/or groups. The editor keeps the
  // same shape with an `id` for keyed rendering, and these two convert between them.
  function fromStored(nodes: InvasionRequirement[]): ReqNode[] {
    return nodes.map(node => {
      if (node.type === 'role') return { id: reqId(), kind: 'leaf', type: 'role', value: node.role_id };
      if (node.type === 'item') return { id: reqId(), kind: 'leaf', type: 'item', value: node.item_key };
      return { id: reqId(), kind: 'group', type: node.type, children: fromStored(node.requirements) };
    });
  }

  function toStored(nodes: ReqNode[]): InvasionRequirement[] {
    const out: InvasionRequirement[] = [];
    for (const node of nodes) {
      if (node.kind === 'leaf') {
        if (node.type === 'role') {
          if (node.value) out.push({ type: 'role', role_id: node.value });
        } else if (node.value) {
          out.push({ type: 'item', item_key: node.value });
        }
      } else {
        const children = toStored(node.children);
        if (children.length) out.push({ type: node.type, requirements: children });
      }
    }
    return out;
  }

  // A condition (role or item) or a nested group is added to the list it belongs to: the root or a group's children.
  function addCondition(list: ReqNode[]) {
    list.push({ id: reqId(), kind: 'leaf', type: 'role', value: '' });
  }

  function addGroup(list: ReqNode[]) {
    list.push({ id: reqId(), kind: 'group', type: 'or', children: [{ id: reqId(), kind: 'leaf', type: 'role', value: '' }] });
  }

  function removeNode(list: ReqNode[], index: number) {
    list.splice(index, 1);
  }

  // A starter item is handed out on registration: it is free, can never be sold or rewarded, and
  // has no requirements to meet. Turning it on clears the fields the rules forbid; turning the shop
  // off clears them too, so the payload never carries what the rules disallow.
  function chooseStarter(next: boolean) {
    starter = next;
    if (next) {
      purchasable = false;
      rewardable = false;
      price = '0';
      shopStocks = '';
      shopReset = '';
      rewardChance = '0';
      requirementTree = [];
    }
  }

  function choosePurchasable(next: boolean) {
    purchasable = next;
    // Turning it on takes the rarity's shop defaults again: the fields were cleared when it was off, so
    // the price, stock and restock should match the rarity rather than sit at zero.
    if (next) shopDefaultsFromRarity();
    else {
      price = '0';
      shopStocks = '';
      shopReset = '';
    }
  }

  // Taking a rarity's shop defaults: price, stock and restock. Used when a rarity is picked and when
  // the item is made purchasable.
  function shopDefaultsFromRarity() {
    const rarity = defs?.rarities.find(row => row.id === rarityId);
    if (!rarity) return;
    price = String(rarity.default_shop_price);
    shopStocks = rarity.default_shop_stocks === null ? '' : String(rarity.default_shop_stocks);
    shopReset = rarity.default_shop_reset ?? '';
  }

  // Taking a rarity's reward chance. Used when a rarity is picked and when the item is made rewardable.
  function rewardDefaultsFromRarity() {
    const rarity = defs?.rarities.find(row => row.id === rarityId);
    if (!rarity) return;
    rewardChance = String(rarity.default_reward_chance);
  }

  function chooseRewardable(next: boolean) {
    rewardable = next;
    // Turning it on takes the rarity's reward chance again, the same way purchasable takes its shop defaults.
    if (next) rewardDefaultsFromRarity();
  }

  // Picking a rarity seeds the transaction fields from its defaults; an admin can still change them.
  function applyRarityDefaults() {
    shopDefaultsFromRarity();
    rewardDefaultsFromRarity();
  }

  const payload = (): InvasionItemInput => ({
    name: name.trim(),
    key: key.trim() || undefined,
    description: description.trim() || null,
    rarity_id: rarityId,
    type: itemType,
    affinity_id: affinityId || null,
    price: purchasable ? Number(price) || 0 : 0,
    cooldown: Number(cooldown) || 0,
    mana_cost: Number(manaCost) || 0,
    accuracy: Number(accuracy) || 0,
    aliases,
    effects: effects
      .filter(effect => effect.effect_id)
      .map(effect => ({
        effect_id: effect.effect_id,
        value: Number(effect.value) || 0,
        value_type: effect.value_type,
        lasting_turns: effect.lasting_turns === '' ? 1 : Number(effect.lasting_turns),
      })),
    requirements: starter ? [] : toStored(requirementTree),
    is_purchasable: purchasable,
    is_rewardable: rewardable,
    is_starter: starter,
    shop_stocks: purchasable && shopStocks !== '' ? Number(shopStocks) : null,
    shop_reset_type: (purchasable && shopReset ? shopReset : null) as InvasionShopResetType | null,
    reward_chance: rewardable && !starter ? Number(rewardChance) || 0 : 0,
  });

  async function save() {
    if (saving) return;
    saving = true;
    try {
      if (editingId) await api.invasion.updateItem(guildId, editingId, payload());
      else await api.invasion.createItem(guildId, payload());
      await reload();
      toast('success', editingId ? 'Item saved' : 'Item added');
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
      await api.invasion.removeItem(guildId, removeTarget.id);
      const removedId = removeTarget.id;
      const wasOpen = editingId === removedId;
      removeTarget = null;
      await reload();
      if (wasOpen) closeForm();
      if (inspectParam.value === removedId) inspectParam.value = '';
      if (comparedIds.includes(removedId)) compareParam.value = comparedIds.filter(id => id !== removedId).join(',');
      if (paged.length === 0 && page > 1) pageParam.value = page - 1;
      toast('success', 'Item removed', 'Past transactions and owned copies keep their record of it.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      removing = false;
    }
  }
</script>

{#snippet aliasesField()}
  <div class={label}>Aliases</div>
  <div class="{control} flex flex-wrap items-center gap-1.5 px-2 py-1" style="min-height: 2.25rem">
    {#each aliases as alias, i (alias)}
      <span class="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
        {alias}
        <button
          type="button"
          class="cursor-pointer rounded p-0.5 hover:bg-black/20"
          onclick={() => removeAlias(i)}
          aria-label="Remove {alias}"
        >
          <X class="h-3 w-3" />
        </button>
      </span>
    {/each}
    <input
      bind:value={aliasInput}
      onkeydown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addAlias();
        }
      }}
      onblur={addAlias}
      maxlength={50}
      placeholder={aliases.length ? '' : 'Type an alias and press Enter'}
      aria-label="Alias"
      class="min-w-[8rem] flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
    />
  </div>
  <p class="mt-1.5 text-xs text-zinc-500">Close spellings match too, as set in the settings.</p>
{/snippet}

{#snippet reqNode(node: ReqNode, list: ReqNode[], index: number)}
  {#if node.kind === 'leaf'}
    <div class="flex items-center gap-2">
      <div class="w-28 shrink-0">
        <Select
          bind:value={node.type}
          options={KIND_OPTIONS}
          label="Requirement kind"
          empty={false}
          class="w-full"
          onchange={() => (node.value = '')}
        />
      </div>
      <div class="min-w-0 flex-1">
        {#if node.type === 'role'}
          <RoleSelect {roles} bind:value={node.value} none="Pick a role" label="Required role" class="w-full" />
        {:else}
          <Select bind:value={node.value} options={itemKeyOptions} placeholder="Pick an item" label="Required item" class="w-full" />
        {/if}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onclick={() => removeNode(list, index)}
        aria-label="Remove condition"
        title="Remove"
        class="shrink-0"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  {:else}
    <div class="border-l-2 border-zinc-700/70 py-1 pl-3">
      <div class="flex items-center gap-2">
        <SegmentedControl bind:value={node.type} options={OPERATOR_OPTIONS} label="Group operator" />
        <span class="text-xs text-zinc-500">{node.type === 'and' ? 'Every condition must match' : 'Any condition can match'}</span>
        <span class="flex-1"></span>
        <Button variant="ghost" size="icon" onclick={() => removeNode(list, index)} aria-label="Remove group" title="Remove group">
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>
      <div class="mt-2 space-y-2">
        {#each node.children as child, i (child.id)}
          {@render reqNode(child, node.children, i)}
        {/each}
        {#if !node.children.length}
          <p class="text-xs text-zinc-500">This group is empty. Add a condition.</p>
        {/if}
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" onclick={() => addCondition(node.children)}>
            <Plus class="h-3.5 w-3.5" />Condition
          </Button>
          <Button variant="ghost" size="sm" onclick={() => addGroup(node.children)}>
            <Plus class="h-3.5 w-3.5" />Group
          </Button>
        </div>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet form()}
  <div class="flex items-center gap-1 border-b border-zinc-800/60" role="tablist" aria-label="Item form section">
    {#each FORM_TABS as tab (tab.id)}
      {@const active = formParam.value === tab.id}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onclick={() => (formParam.value = tab.id)}
        class="relative -mb-px inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange-500/50 {active
          ? 'text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300'}"
      >
        <tab.icon class="h-3.5 w-3.5 {active ? toneText[tone()] : ''}" />
        {tab.label}
        <span
          class="absolute inset-x-1 -bottom-px h-0.5 rounded-full transition-colors {active
            ? 'bg-current ' + toneText[tone()]
            : 'bg-transparent'}"
          aria-hidden="true"
        ></span>
      </button>
    {/each}
  </div>
  {#if formParam.value === 'general'}
    <div class="mt-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <span class={label}>Key</span>
          <Input
            bind:value={key}
            maxlength={64}
            placeholder="item-key"
            oninput={restrictTo(
              value =>
                value
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, '')
                  .slice(0, 64),
              value => ((key = value), (keyTouched = true)),
            )}
            aria-label="Item key"
          />
          <p class="mt-1.5 text-xs text-zinc-500">The stable handle rewards and requirements use. Lowercase letters, digits, - or _.</p>
        </div>
        <div>
          <span class={label}>Name</span>
          <Input bind:value={name} maxlength={100} placeholder="Item name" aria-label="Item name" />
        </div>
        <div class="sm:col-span-2">
          <span class={label}>Description</span>
          <Textarea bind:value={description} rows={2} maxlength={1000} placeholder="Item description..." aria-label="Description" />
        </div>
        <div class="sm:col-span-2">{@render aliasesField()}</div>
        <div class="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <div>
            <span class={label}>Rarity</span>
            <Select
              bind:value={rarityId}
              options={rarityOptions}
              label="Rarity"
              empty={false}
              class="w-full"
              onchange={applyRarityDefaults}
            />
          </div>
          <div>
            <span class={label}>Element</span>
            <Select bind:value={affinityId} options={affinityOptions} placeholder="No element" label="Element" class="w-full" />
          </div>
          <div>
            <span class={label}>Type</span>
            <Select bind:value={itemType} options={TYPE_OPTIONS} label="Item type" empty={false} class="w-full" />
          </div>
        </div>
      </div>
    </div>
  {:else if formParam.value === 'battle'}
    <div class="mt-5">
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <span class={label}>Mana cost</span>
          <Input
            bind:value={manaCost}
            inputmode="numeric"
            maxlength={5}
            aria-label="Mana cost"
            oninput={restrictTo(onlyDigits, v => (manaCost = v))}
          />
        </div>
        <div>
          <span class={label}>Cooldown (turns)</span>
          <Input
            bind:value={cooldown}
            inputmode="numeric"
            maxlength={4}
            aria-label="Cooldown"
            oninput={restrictTo(onlyDigits, v => (cooldown = v))}
          />
        </div>
        <div>
          <span class={label}>Accuracy (%)</span>
          <Input
            bind:value={accuracy}
            inputmode="decimal"
            maxlength={5}
            aria-label="Accuracy"
            oninput={restrictTo(onlyDecimal, v => (accuracy = v))}
          />
        </div>
        <div class="sm:col-span-3">
          <div class="flex items-center justify-between gap-3">
            <span class={label}>Effects</span>
            <Button variant="secondary" size="sm" onclick={addEffect} disabled={!defs?.effects.length}>
              <Plus class="h-3.5 w-3.5" />Add effect
            </Button>
          </div>

          <div class="mt-2 overflow-hidden rounded-xl ring-1 ring-zinc-800/60">
            {#if effects.length}
              <div
                class="hidden gap-3 bg-zinc-800/30 px-4 py-2 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <span class="{caps} text-zinc-400">Name</span>
                <span class="{caps} text-zinc-400">Type</span>
                <span class="{caps} text-zinc-400">Value</span>
                <span class="{caps} text-zinc-400">Turns</span>
                <span></span>
              </div>
            {/if}
            <div class="divide-y divide-zinc-800/40">
              {#each effects as effect, i (i)}
                {@const definition = effectOf(effect.effect_id)}
                <div class="grid items-start gap-3 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div class="min-w-0">
                    <Combobox
                      bind:value={effect.effect_id}
                      options={effectOptions}
                      placeholder="Search effects"
                      label="Effect"
                      class="w-full"
                      onchange={() => {
                        const next = effectOf(effect.effect_id);
                        if (next) {
                          effect.value = String(next.default_value);
                          effect.value_type = next.default_value_type;
                          effect.lasting_turns = String(next.default_turns ?? 1);
                        }
                      }}
                    />
                    <div class="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      {#if definition}
                        <Badge tone="neutral">{EFFECT_TYPE_LABELS[definition.type]}</Badge>
                        <span class="truncate" title={definition.description ?? ''}>{definition.description || 'No description'}</span>
                      {:else}
                        <span>Pick an effect</span>
                      {/if}
                    </div>
                  </div>
                  <Select bind:value={effect.value_type} options={VALUE_TYPES} label="Value type" empty={false} class="w-full" />
                  <Input
                    bind:value={effect.value}
                    inputmode="decimal"
                    maxlength={8}
                    aria-label="Effect value"
                    oninput={restrictTo(onlyDecimal, v => (effect.value = v))}
                  />
                  <div class="min-w-0">
                    <Input
                      bind:value={effect.lasting_turns}
                      inputmode="numeric"
                      maxlength={3}
                      aria-label="Lasting turns"
                      title="0 keeps the effect forever; 1 applies on the turn it is used"
                      oninput={restrictTo(onlyDigits, v => (effect.lasting_turns = v))}
                    />
                    {#if Number(effect.lasting_turns) === 0}
                      <p class="mt-1 text-xs text-zinc-500">Permanent</p>
                    {/if}
                  </div>
                  <div class="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === 0}
                      onclick={() => moveEffect(i, -1)}
                      aria-label="Move effect up"
                      title="Move up"
                    >
                      <ChevronUp class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === effects.length - 1}
                      onclick={() => moveEffect(i, 1)}
                      aria-label="Move effect down"
                      title="Move down"
                    >
                      <ChevronDown class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onclick={() => (effects = effects.filter((_, j) => j !== i))}
                      aria-label="Remove effect"
                      title="Remove"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
            {#if !effects.length}
              <p class="px-4 py-8 text-xs text-zinc-500">No effects yet. Add one to give this item its power.</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="mt-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex items-start justify-between gap-3 sm:col-span-2">
          <div class="min-w-0">
            <div class={label}>Starter</div>
            <p class="text-xs text-zinc-500">Given to a player when they register. A starter item is free.</p>
          </div>
          <Toggle on={starter} label="Starter" onclick={() => chooseStarter(!starter)} />
        </div>
        <div class="flex items-start justify-between gap-3 sm:col-span-2">
          <div class="min-w-0">
            <div class={label}>Rewardable</div>
            <p class="text-xs text-zinc-500">
              {starter ? 'A starter item is never handed out as a reward.' : 'Can be awarded to players as a reward.'}
            </p>
          </div>
          <Toggle on={rewardable} label="Rewardable" disabled={starter} onclick={() => chooseRewardable(!rewardable)} />
        </div>
        {#if rewardable && !starter}
          <div class="grid gap-4 sm:col-span-2 sm:grid-cols-3">
            <div>
              <span class={label}>Reward chance (%)</span>
              <Input
                bind:value={rewardChance}
                inputmode="decimal"
                maxlength={5}
                aria-label="Reward chance"
                oninput={restrictTo(onlyDecimal, v => (rewardChance = v))}
              />
              <p class="mt-1.5 text-xs text-zinc-500">Odds this item drops when a reward is rolled.</p>
            </div>
          </div>
        {/if}
        <div class="flex items-start justify-between gap-3 sm:col-span-2">
          <div class="min-w-0">
            <div class={label}>Purchasable</div>
            <p class="text-xs text-zinc-500">
              {starter ? 'A starter item is never sold.' : 'Sell it in the shop and give it a price and stock.'}
            </p>
          </div>
          <Toggle on={purchasable} label="Purchasable" disabled={starter} onclick={() => choosePurchasable(!purchasable)} />
        </div>
        {#if purchasable}
          <div class="grid gap-4 sm:col-span-2 sm:grid-cols-3">
            <div>
              <span class={label}>Price</span>
              <Input
                bind:value={price}
                inputmode="numeric"
                maxlength={9}
                aria-label="Price"
                oninput={restrictTo(onlyDigits, v => (price = v))}
              />
              {#if (Number(price) || 0) <= 0}
                <p class="mt-1.5 text-xs text-red-400">A purchasable item needs a price above 0.</p>
              {/if}
            </div>
            <div>
              <span class={label}>Stock</span>
              <Input
                bind:value={shopStocks}
                inputmode="numeric"
                maxlength={5}
                placeholder="Unlimited"
                aria-label="Stock"
                oninput={restrictTo(onlyDigits, v => (shopStocks = v))}
              />
            </div>
            <div>
              <span class={label}>Restock</span>
              <Select bind:value={shopReset} options={RESET_OPTIONS} placeholder="Never" label="Shop restock" class="w-full" />
            </div>
          </div>
        {/if}
        <div class="sm:col-span-2">
          <div class="flex items-center justify-between gap-3">
            <span
              class={label}
              title="A player can use the item only when every requirement below is met. Use a group to combine conditions with And or Or."
              >Requirements</span
            >
            {#if !starter}
              <div class="flex items-center gap-2">
                <Button variant="secondary" size="sm" onclick={() => addCondition(requirementTree)}>
                  <Plus class="h-3.5 w-3.5" />Condition
                </Button>
                <Button variant="secondary" size="sm" onclick={() => addGroup(requirementTree)}>
                  <Plus class="h-3.5 w-3.5" />Group
                </Button>
              </div>
            {/if}
          </div>

          {#if starter}
            <p class="text-xs text-zinc-500">A starter item is handed out at registration, so it has no requirements.</p>
          {:else}
            <div class="mt-2 rounded-xl bg-zinc-800/20 p-3 ring-1 ring-zinc-800/60">
              {#if requirementTree.length}
                <div class="space-y-2">
                  {#each requirementTree as node, i (node.id)}
                    {@render reqNode(node, requirementTree, i)}
                  {/each}
                </div>
              {:else}
                <p class="py-3 text-xs text-zinc-500">No requirements. Anyone can use this item.</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="mt-5 flex justify-end gap-2">
    <Button variant="ghost" onclick={closeForm}>Cancel</Button>
    <Button variant="primary" onclick={save} disabled={saving || !name.trim() || !rarityId || (purchasable && (Number(price) || 0) <= 0)}>
      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
    </Button>
  </div>
{/snippet}

{#snippet sidePanel()}
  <Card>
    {#if inspected}
      {@const rarity = rarityOf(inspected.rarity_id)}
      {@const affinity = affinityOf(inspected.affinity_id)}
      <div class="flex items-start justify-between gap-2">
        <SectionTitle icon={Eye} title="Inspect" />
        <Button
          variant="ghost"
          size="icon"
          onclick={() => {
            inspectParam.value = '';
            compareParam.value = '';
          }}
          aria-label="Clear inspection"
          title="Clear"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div class="mt-3">
        <p class="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          {#if glyph(rarity?.emoji)}<span class="shrink-0">{glyph(rarity?.emoji)}</span>{/if}
          <span class="truncate">{inspected.name}</span>
        </p>
        <p class="mt-0.5 truncate text-xs text-zinc-500">{inspected.aliases.length ? inspected.aliases.join(', ') : inspected.key}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          {#if rarity}<Badge tone={rarityTone(rarity.id)}>{rarity.name}</Badge>{/if}
          <Badge tone="neutral">{TYPE_LABELS[inspected.type]}</Badge>
          {#if affinity}
            <Badge tone="neutral">
              {#if glyph(affinity.emoji)}{glyph(affinity.emoji)}{/if}{titleCase(affinity.name)}
            </Badge>
          {/if}
        </div>
      </div>

      <div class="mt-4 border-t border-zinc-800/40 pt-3">
        <div class="flex justify-center">
          <RadarChart
            labels={RADAR_AXES}
            max={radarMax}
            series={radarSeries}
            format={(value, axis) => (axis === 3 ? `${formatNumber(value)}%` : formatNumber(value))}
          />
        </div>
      </div>

      {#if compareEntries.length > 1}
        <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {#each compareEntries as entry (entry.id)}
            <span class="flex min-w-0 items-center gap-1.5 text-xs text-zinc-400" title={entry.item.name}>
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current {toneText[entry.tone]}"></span>
              <span class="truncate">{entry.item.name}</span>
            </span>
          {/each}
        </div>
      {/if}

      <div class="mt-4 border-t border-zinc-800/40 pt-1">
        {#each comparisonRows as row (row.label)}
          <div class="border-b border-zinc-800/30 py-2 last:border-0">
            <p class="{label} whitespace-nowrap">{row.label}</p>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {#each row.values as value, i (i)}
                <span
                  class="rounded-md px-1.5 py-0.5 text-[11px] tabular-nums {tile[value.tone]} {value.best
                    ? 'font-semibold brightness-125'
                    : row.values.length > 1
                      ? 'brightness-50'
                      : ''}">{value.text}</span
                >
              {/each}
            </div>
          </div>
        {/each}
      </div>

      {#if isAdmin}
        <div class="mt-4 border-t border-zinc-800/40 pt-3">
          <Button variant="soft" size="sm" class="w-full" onclick={() => toggle(inspected)}>
            <Pencil class="h-3.5 w-3.5" />{editingId === inspected.id ? 'Close editor' : 'Edit item'}
          </Button>
        </div>
      {/if}
    {:else}
      <div class="flex items-start justify-between gap-2">
        <SectionTitle icon={SlidersHorizontal} title="Filter" />
        {#if filtering}
          <Button variant="ghost" size="icon" onclick={clearFilters} aria-label="Clear filters" title="Clear filters">
            <X class="h-3.5 w-3.5" />
          </Button>
        {/if}
      </div>

      <div class="mt-3 space-y-3">
        <Input bind:value={searchText} oninput={commitFilters} icon={Search} placeholder="Search items" aria-label="Search items" />

        <div>
          <span class={label}>Rarity</span>
          <Select bind:value={rarityFilter.value} options={rarityOptions} placeholder="All rarities" label="Rarity filter" class="w-full" />
        </div>
        <div>
          <span class={label}>Element</span>
          <Select
            bind:value={elementFilter.value}
            options={affinityOptions}
            placeholder="All elements"
            label="Element filter"
            class="w-full"
          />
        </div>
        <div>
          <span class={label}>Type</span>
          <Select bind:value={typeFilter.value} options={TYPE_OPTIONS} placeholder="All types" label="Type filter" class="w-full" />
        </div>

        <div class="border-t border-zinc-800/40 pt-3">
          <div class={label}>Availability</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2 text-xs text-zinc-300">
              <span>For sale</span>
              <Toggle on={saleFilter.value === '1'} label="For sale" onclick={() => toggleFilter(saleFilter, saleFilter.value !== '1')} />
            </div>
            <div class="flex items-center justify-between gap-2 text-xs text-zinc-300">
              <span>Rewardable</span>
              <Toggle
                on={rewardFilter.value === '1'}
                label="Rewardable"
                onclick={() => toggleFilter(rewardFilter, rewardFilter.value !== '1')}
              />
            </div>
            <div class="flex items-center justify-between gap-2 text-xs text-zinc-300">
              <span>Starter</span>
              <Toggle
                on={starterFilter.value === '1'}
                label="Starter"
                onclick={() => toggleFilter(starterFilter, starterFilter.value !== '1')}
              />
            </div>
          </div>
        </div>

        <div class="border-t border-zinc-800/40 pt-3">
          <div class={label}>Price</div>
          <div class="grid grid-cols-2 gap-2">
            <Input
              bind:value={priceMinText}
              inputmode="numeric"
              maxlength={9}
              placeholder="Min"
              aria-label="Minimum price"
              oninput={restrictTo(onlyDigits, value => ((priceMinText = value), commitFilters()))}
            />
            <Input
              bind:value={priceMaxText}
              inputmode="numeric"
              maxlength={9}
              placeholder="Max"
              aria-label="Maximum price"
              oninput={restrictTo(onlyDigits, value => ((priceMaxText = value), commitFilters()))}
            />
          </div>
        </div>

        <div class="border-t border-zinc-800/40 pt-3">
          <div class={label}>Total power</div>
          <div class="grid grid-cols-2 gap-2">
            <Input
              bind:value={powerMinText}
              inputmode="numeric"
              maxlength={6}
              placeholder="Min"
              aria-label="Minimum power"
              oninput={restrictTo(onlyDigits, value => ((powerMinText = value), commitFilters()))}
            />
            <Input
              bind:value={powerMaxText}
              inputmode="numeric"
              maxlength={6}
              placeholder="Max"
              aria-label="Maximum power"
              oninput={restrictTo(onlyDigits, value => ((powerMaxText = value), commitFilters()))}
            />
          </div>
        </div>
      </div>
    {/if}
  </Card>
{/snippet}

<div class="space-y-5">
  {#if configParam.value}
    <div class="flex items-center justify-end gap-3">
      <Button variant="secondary" onclick={() => (configParam.value = '')}>
        <ArrowLeft class="h-3.5 w-3.5" />Back to list
      </Button>
    </div>
    <ItemConfig {guildId} {isAdmin} meta={defs} onChanged={next => (defs = next)} />
  {:else}
    <div class="flex items-center justify-between gap-3">
      {#if items === null}
        <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
      {:else}
        <p class="text-xs text-zinc-500">
          {#if filtering}{matched} of {total} {total === 1 ? 'item' : 'items'}{:else}{total} {total === 1 ? 'item' : 'items'}{/if}
        </p>
      {/if}
      <div class="flex items-center gap-2">
        {#if !defs}
          <ControlSkeleton class="w-28" h="h-8" />
          {#if isAdmin}<ControlSkeleton class="w-28" h="h-8" />{/if}
        {:else}
          <Button
            variant="secondary"
            onclick={() => {
              closeForm();
              configParam.value = 'general';
            }}
          >
            <Settings2 class="h-3.5 w-3.5" />Configure
          </Button>
          {#if isAdmin}
            <Button variant="primary" onclick={() => (adding ? closeForm() : openCreate())}>
              <Plus class="h-3.5 w-3.5" />Add item
            </Button>
          {/if}
        {/if}
      </div>
    </div>

    <div class="grid items-start gap-3 lg:grid-cols-[17rem_1fr]">
      <div>
        {#if items === null || !defs}
          <Card>
            <SectionTitle icon={SlidersHorizontal} title="Filter" />
            <div class="mt-4 space-y-3">
              <ControlSkeleton class="w-full" />
              <ControlSkeleton class="w-full" />
              <ControlSkeleton class="w-full" />
            </div>
          </Card>
        {:else}
          {@render sidePanel()}
        {/if}
      </div>

      <div class="min-w-0 space-y-5">
        {#if adding && defs}
          <div transition:slide={{ duration: 220, easing: cubicOut }}>
            <Card>
              {@render form()}
            </Card>
          </div>
        {/if}

        {#if items === null}
          <Card flush>
            <TableSkeleton
              columns={['w-16', 'flex-1', 'w-28', 'w-28', 'w-20', 'w-32', 'w-20', 'w-24', 'w-32']}
              headings={['#', 'Name', 'Rarity', 'Type', 'Price', 'Element', 'Shop', 'Reward', '']}
              kinds={['bar', 'text', 'pill', 'bar', 'bar', 'bar', 'pill', 'pill', 'actions']}
              rows={4}
              rowHeight="h-14"
            />
          </Card>
        {:else if items.length === 0}
          <EmptyState
            kind="modules"
            title="No items yet"
            description="Add an item to build the shop, give it to players and use it in rounds."
          />
        {:else if matched === 0}
          <EmptyState
            kind="search"
            title="No items match"
            description="No item has that name, rarity or price range. Clear the filters to see the whole catalog again."
          />
        {:else}
          <Card flush>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                    <th class="{th} w-16">#</th>
                    <th class={th}>Name</th>
                    <th class="{th} w-28">Rarity</th>
                    <th class="{th} w-28">Type</th>
                    <th class="{th} w-20">Price</th>
                    <th class="{th} w-32">Element</th>
                    <th class="{th} w-20">Shop</th>
                    <th class="{th} w-24">Reward</th>
                    <th class="{th} w-32"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/30">
                  {#each paged as item, i (item.id)}
                    {@const rarity = rarityOf(item.rarity_id)}
                    {@const affinity = affinityOf(item.affinity_id)}
                    {@const itemCompareTone = compareTone(item.id)}
                    {@const full = Boolean(inspected) && comparedIds.length >= MAX_COMPARE - 1}
                    <tr class="transition-colors {inspectParam.value === item.id ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/30'}">
                      <td class="{cell} text-zinc-500">{(page - 1) * limit + i + 1}</td>
                      <td class="{cell} text-zinc-200">
                        <button
                          type="button"
                          class="block w-full text-left"
                          onclick={() => toggleInspect(item)}
                          aria-label="Inspect {item.name}"
                          title="Inspect"
                        >
                          <span class="flex items-center gap-2 truncate">
                            {#if glyph(rarity?.emoji)}<span class="shrink-0">{glyph(rarity?.emoji)}</span>{/if}
                            <span class="truncate">{item.name}</span>
                          </span>
                          <span class="block truncate text-xs text-zinc-500"
                            >{item.aliases.length ? item.aliases.join(', ') : item.key}</span
                          >
                        </button>
                      </td>
                      <td class={cell}
                        >{#if rarity}<Badge tone={rarityTone(rarity.id)}>{rarity.name}</Badge>{:else}-{/if}</td
                      >
                      <td class="{cell} text-zinc-300">{TYPE_LABELS[item.type]}</td>
                      <td class="{cell} text-zinc-300">{item.price}</td>
                      <td class="{cell} text-zinc-300">
                        {#if affinity}
                          <span class="inline-flex items-center gap-1.5">
                            {#if glyph(affinity.emoji)}<span>{glyph(affinity.emoji)}</span>{/if}{affinity.name}
                          </span>
                        {:else}-{/if}
                      </td>
                      <td class={cell}
                        >{#if item.is_purchasable}<Badge tone="info">For sale</Badge>{:else if item.is_starter}<Badge tone="brand"
                            >Starter</Badge
                          >{:else}-{/if}</td
                      >
                      <td class={cell}
                        >{#if item.is_rewardable}<Badge tone="accent">Reward</Badge>{:else}-{/if}</td
                      >
                      <td class="{cell} text-right">
                        <div class="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!itemCompareTone && full}
                            onclick={() => toggleCompare(item)}
                            aria-label="Compare {item.name}"
                            title={inspectParam.value === item.id
                              ? 'Cancel inspection'
                              : itemCompareTone
                                ? 'Remove from comparison'
                                : full
                                  ? `Compare up to ${MAX_COMPARE} items`
                                  : 'Compare with this item'}
                          >
                            <GitCompareArrows class="h-3.5 w-3.5 {itemCompareTone ? toneText[itemCompareTone] : ''}" />
                          </Button>
                          {#if isAdmin}
                            <Button
                              variant="ghost"
                              size="icon"
                              onclick={() => toggle(item)}
                              aria-label={editingId === item.id ? `Close ${item.name}` : `Edit ${item.name}`}
                              title={editingId === item.id ? 'Close' : 'Edit'}
                            >
                              <Pencil class="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onclick={() => (removeTarget = item)}
                              aria-label="Remove {item.name}"
                              title="Remove"
                            >
                              <Trash2 class="h-3.5 w-3.5" />
                            </Button>
                          {/if}
                        </div>
                      </td>
                    </tr>
                    {#if isAdmin && editingId === item.id}
                      <tr>
                        <td colspan="9" class="p-0">
                          <div
                            class="border-t border-zinc-800/40 bg-zinc-800/10 p-5"
                            transition:slide={{ duration: 220, easing: cubicOut }}
                          >
                            {@render form()}
                          </div>
                        </td>
                      </tr>
                    {/if}
                  {/each}
                </tbody>
              </table>
            </div>

            <Pagination
              {page}
              {limit}
              total={matched}
              onPage={next => (pageParam.value = next)}
              onLimit={next => {
                limitParam.value = next;
                pageParam.value = 1;
              }}
            />
          </Card>
        {/if}
      </div>
    </div>
  {/if}
</div>

<ConfirmModal
  show={!!removeTarget}
  title="Remove {removeTarget?.name ?? 'this item'}?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={removing}
  onConfirm={remove}
  onClose={() => (removeTarget = null)}
>
  The item leaves the shop and the editor. Past transactions and copies players already own keep their record of it, and the key stays
  taken.
</ConfirmModal>
