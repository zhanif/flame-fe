<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelsPicker from '$lib/components/ChannelsPicker.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type ChatCompletionConfig, type ChatCompletionLimits, type ChatCompletionTest, type ChatCompletionView, type DiscordChannel } from '$lib/api/endpoints';
  import { onlyDecimal, onlyDigits, restrictTo } from '$lib/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlParam } from '$lib/url-param';
  import { Brain, Gauge, Info, KeyRound, MessageCircle, RotateCcw, Server, ShieldCheck, Sparkles, Trash2, Zap } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const tabParam = urlParam('tab', 'chat');
  const tab = $derived(tabParam.value);
  let info = $state(false);

  // What is edited: every number is text while it is typed (so a box can be empty), and is checked against the
  // bounds of the chosen mode before it can be saved.
  interface Form {
    enabled: boolean;
    channel_ids: string[];
    mode: 'flame' | 'own';
    base_url: string;
    model: string;
    system_prompt: string;
    temperature: string;
    top_p: string;
    presence_penalty: string;
    frequency_penalty: string;
    max_tokens: string;
    context_messages: string;
    context_minutes: string;
    max_input_chars: string;
    user_daily_limit: string;
    guild_daily_limit: string;
  }

  const CUSTOM = 'custom';

  let view: ChatCompletionView | null = $state(null);
  let channels: DiscordChannel[] = $state([]);
  let form: Form | null = $state(null);
  let apiKey = $state('');
  let removeKey = $state(false);
  let saving = $state(false);
  let testing = $state(false);
  let tested: ChatCompletionTest | null = $state(null);

  // What each parameter starts as, and what Revert puts back. A parameter the server never set shows its default as a number.
  type Numeric = 'temperature' | 'top_p' | 'presence_penalty' | 'frequency_penalty' | 'max_tokens' | 'context_messages' | 'context_minutes' | 'max_input_chars' | 'user_daily_limit' | 'guild_daily_limit';
  const DEFAULTS: Record<Numeric, string | { flame: string; own: string }> = {
    temperature: '0.8',
    top_p: '1',
    presence_penalty: '0',
    frequency_penalty: '0',
    max_tokens: { flame: '400', own: '1024' },
    context_messages: '6',
    context_minutes: '3',
    max_input_chars: '300',
    user_daily_limit: '3',
    guild_daily_limit: { flame: '50', own: '0' },
  };
  const defaultOf = (field: Numeric, mode: 'flame' | 'own'): string => {
    const value = DEFAULTS[field];
    return typeof value === 'string' ? value : value[mode];
  };
  const text = (value: number | null, fallback = '') => (value === null ? fallback : String(value));
  const formOf = (config: ChatCompletionConfig): Form => ({
    enabled: config.enabled,
    channel_ids: [...config.channel_ids],
    mode: config.mode,
    base_url: config.base_url ?? '',
    model: config.model ?? '',
    system_prompt: config.system_prompt ?? '',
    temperature: text(config.temperature, defaultOf('temperature', config.mode)),
    top_p: text(config.top_p, defaultOf('top_p', config.mode)),
    presence_penalty: text(config.presence_penalty, defaultOf('presence_penalty', config.mode)),
    frequency_penalty: text(config.frequency_penalty, defaultOf('frequency_penalty', config.mode)),
    max_tokens: text(config.max_tokens, defaultOf('max_tokens', config.mode)),
    context_messages: text(config.context_messages),
    context_minutes: text(config.context_minutes),
    max_input_chars: text(config.max_input_chars),
    user_daily_limit: text(config.user_daily_limit),
    guild_daily_limit: text(config.guild_daily_limit),
  });
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  // A decimal that may be negative (the penalties go from -2 to 2).
  const onlyDecimalSigned = (value: string) => (value.trimStart().startsWith('-') ? '-' : '') + onlyDecimal(value.replace(/-/g, ''));

  function load(next: ChatCompletionView) {
    view = next;
    form = formOf(next);
    apiKey = '';
    removeKey = false;
  }

  onMount(async () => {
    try {
      const [config, list] = await Promise.all([api.chatCompletion.config(guildId), api.channels(guildId)]);
      channels = list;
      load(config);
    } catch (e: any) {
      toast('error', e.message);
    }
  });

  const limits = $derived.by((): ChatCompletionLimits | null => {
    const current: ChatCompletionView | null = view;
    const draft: Form | null = form;
    return current && draft ? current.limits[draft.mode] : null;
  });

  const REQUIRED = [
    ['context_messages', 'Earlier messages', 'context_messages'],
    ['context_minutes', 'Minutes of context', 'context_minutes'],
    ['max_input_chars', 'Longest message', 'max_input_chars'],
    ['user_daily_limit', 'Answers per member', 'user_daily_limit'],
    ['guild_daily_limit', 'Answers per server', 'guild_daily_limit'],
  ] as const;
  // The limits of the Chat tab, in the order they are shown.
  const LIMIT_ROWS = [
    ['context_messages', 'Earlier messages'],
    ['context_minutes', 'Minutes of context'],
    ['max_input_chars', 'Longest message'],
    ['user_daily_limit', 'Answers per member'],
    ['guild_daily_limit', 'Answers per server'],
  ] as const;
  const limitHint = (field: (typeof LIMIT_ROWS)[number][0], mode: 'flame' | 'own'): string => {
    switch (field) {
      case 'context_messages':
        return 'How many earlier messages of the channel the bot reads to follow the conversation. 0 reads none.';
      case 'context_minutes':
        return 'Only messages this recent count as context.';
      case 'max_input_chars':
        return 'A longer message is not answered.';
      case 'user_daily_limit':
        return `Answers a member gets a day (UTC).${mode === 'own' ? ' 0 means no limit.' : ' Flame’s own service keeps this low.'}`;
      default:
        return `Answers the server gets a day (UTC), for everyone together.${mode === 'own' ? ' 0 means no limit.' : ''}`;
    }
  };
  const chipsOf = (min: number, max: number, standard: string, extra: string[] = []) => [`${min} to ${max}`, `Default ${standard}`, ...extra];
  // What each parameter does, in plain words: what a lower and a higher value change.
  const EXPLAIN: Record<string, string> = {
    temperature: 'How creative the answers are. Lower is steadier and predictable, higher is more varied and surprising.',
    top_p: 'How wide a choice of words the bot picks from. Lower sticks to the most likely words, 1 allows any. Change this or Temperature, not both.',
    presence_penalty: 'How much the bot moves on to new topics. Higher brings up new things, below 0 stays on the same topic.',
    frequency_penalty: 'How much the bot avoids repeating itself. Higher repeats the same words less, below 0 repeats more.',
    max_tokens: 'How long an answer can get, in tokens (one token is about three quarters of a word). Lower is shorter and cheaper.',
  };
  const SAMPLING = [
    ['temperature', 'Temperature', 'temperature'],
    ['top_p', 'Top P', 'top_p'],
    ['presence_penalty', 'Presence penalty', 'penalty'],
    ['frequency_penalty', 'Frequency penalty', 'penalty'],
    ['max_tokens', 'Answer length', 'max_tokens'],
  ] as const;

  // What is wrong with each number, by field, or nothing.
  const problems = $derived.by((): Record<string, string> => {
    const draft: Form | null = form;
    const bounds = limits;
    const found: Record<string, string> = {};
    if (!draft || !bounds) return found;

    for (const [field, , key] of REQUIRED) {
      const [min, max] = bounds[key];
      const value = number(draft[field]);
      if (value === null || !Number.isInteger(value) || value < min || value > max) found[field] = `${min} to ${max}`;
    }
    for (const [field, , key] of SAMPLING) {
      const [min, max] = bounds[key];
      const value = number(draft[field]);
      if (value === null || Number.isNaN(value) || value < min || value > max || (field === 'max_tokens' && !Number.isInteger(value))) found[field] = `${min} to ${max}`;
    }
    if (draft.mode === 'own') {
      if (draft.base_url.trim() && !/^https:\/\/\S+$/i.test(draft.base_url.trim())) found.base_url = 'It must start with https://';
    }
    if (draft.system_prompt.length > 1500) found.system_prompt = 'At most 1500 characters';
    return found;
  });

  const payload = $derived.by(() => {
    const draft: Form | null = form;
    if (!draft) return null;
    return {
      enabled: draft.enabled,
      channel_ids: draft.channel_ids,
      mode: draft.mode,
      base_url: draft.base_url.trim() || null,
      model: draft.model.trim() || null,
      system_prompt: draft.system_prompt.trim() || null,
      temperature: number(draft.temperature),
      top_p: number(draft.top_p),
      presence_penalty: number(draft.presence_penalty),
      frequency_penalty: number(draft.frequency_penalty),
      max_tokens: number(draft.max_tokens),
      context_messages: number(draft.context_messages) ?? 0,
      context_minutes: number(draft.context_minutes) ?? 0,
      max_input_chars: number(draft.max_input_chars) ?? 0,
      user_daily_limit: number(draft.user_daily_limit) ?? 0,
      guild_daily_limit: number(draft.guild_daily_limit) ?? 0,
    } satisfies ChatCompletionConfig;
  });

  const dirty = $derived.by(() => {
    const current: ChatCompletionView | null = view;
    const draft: Form | null = form;
    return !!current && !!draft && (JSON.stringify(draft) !== JSON.stringify(formOf(current)) || !!apiKey.trim() || removeKey);
  });
  const invalid = $derived(Object.keys(problems).length > 0);

  async function save() {
    const body = payload;
    if (!body || saving || invalid) return;
    saving = true;
    try {
      load(await api.chatCompletion.updateConfig(guildId, { ...body, ...(removeKey ? { api_key: null } : apiKey.trim() ? { api_key: apiKey.trim() } : {}) }));
      tested = null;
      toast('success', 'Chat Completion saved', 'Your changes are live for this server.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function test() {
    if (testing) return;
    testing = true;
    tested = null;
    try {
      tested = await api.chatCompletion.test(guildId);
      toast('success', 'The service answered', `${tested.ms} ms`);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      testing = false;
    }
  }

  // Picking a service fills its address and a model to start from; a model typed by hand is kept.
  const presetId = $derived.by(() => {
    const draft: Form | null = form;
    return view?.presets.find(preset => preset.base_url === draft?.base_url.trim().replace(/\/+$/, ''))?.id ?? CUSTOM;
  });
  function pickPreset(id: string) {
    const draft: Form | null = form;
    if (!draft || !view) return;
    const preset = view.presets.find(p => p.id === id);
    if (!preset) {
      draft.base_url = '';
      return;
    }
    const previous = view.presets.find(p => p.id === presetId);
    draft.base_url = preset.base_url;
    if (!draft.model.trim() || draft.model === previous?.model) draft.model = preset.model;
  }

  const keyHint = $derived.by(() => {
    const current: ChatCompletionView | null = view;
    return current?.has_api_key && !removeKey ? `A key ending in ${current.api_key_hint ?? '…'} is saved. Type a new one to replace it.` : 'Pasted once and kept sealed: it is never shown again.';
  });
  const meter = (used: number, max: number) => Math.min(100, Math.round((used / Math.max(max, 1)) * 100));

  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    chat: {
      title: 'How the bot answers',
      steps: [
        { text: 'A message that starts with a mention of the bot, or that replies to one of its messages, gets an answer. Nothing else is read or sent anywhere.' },
        { text: 'The bot reads the last few messages of the channel for context (you choose how many and how recent) and sends them with the question to the AI service. The people in the channel can see this happen: it is the same chat.' },
        { text: 'Each member has a daily number of answers, and so does the server. When it is used up the member is told once, and afterwards only a reaction says so. A request that fails does not count.' },
        { text: 'Answers never ping anyone: mentions in them are written as plain text.' },
      ],
    },
    service: {
      title: 'Which AI answers',
      steps: [
        { text: "Flame's service is shared by every server, so it is limited: a few answers per member a day, a short answer length, and a total across all servers. It needs nothing from you." },
        { text: 'Your own key lifts those limits: pick a service (Groq, OpenAI, OpenRouter, or any other that speaks the OpenAI chat format), a model, and paste its API key. You pay that service directly.' },
        { text: 'The key is sealed before it is stored and never shown again, not even to admins. Test sends one tiny request to check the key and the model work.' },
      ],
    },
    behavior: {
      title: 'How the answers are shaped',
      steps: [
        { text: 'The behavior text tells the model who it is and how to talk. {bot} and {server} are replaced by the bot name and the server name. A few safety rules are always added after it.' },
        { text: 'Temperature and Top P make answers more varied or more predictable; the penalties discourage repeating. Leave a box empty to use the service default. Answer length limits how long a reply can get.' },
      ],
    },
  };
  const hint = $derived(HINTS[tab]);
</script>

<PageHeader module="chat-completion" description="Let members talk to the bot with an AI service of Flame or one of your own" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tabParam.value}
      tabs={[
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'service', label: 'AI service', icon: Server },
        { id: 'behavior', label: 'Behavior', icon: Brain },
      ]}
    />
    <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
  </div>

  <InfoPanel show={info} title={hint.title} tone="vermilion" steps={hint.steps} />
  {#if view}<WarningBanner warnings={view.warnings} />{/if}

  {#if !view || !form || !limits}
    <Card>
      <FormSkeleton fields={4} hint />
    </Card>
  {:else}
    {#if tab === 'chat'}
      <Card>
        <SectionTitle icon={MessageCircle} title="Chat" class="mb-5" />
        <SettingRow title="Answer messages" hint="The bot answers a message that mentions it or replies to it.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{form.enabled ? 'On' : 'Off'}</span>
            <Toggle on={form.enabled} disabled={!isAdmin} label="Chat Completion on" onclick={() => (form!.enabled = !form!.enabled)} />
          </div>
        </SettingRow>
        <SettingRow title="Where" hint={`A channel, thread or forum where the bot answers; a forum covers its threads. ${view.limits[form.mode].max_channels === 1 ? 'Only one for now.' : `Up to ${view.limits[form.mode].max_channels}.`} None means everywhere it can see.`}>
          <ChannelsPicker {channels} selected={form.channel_ids} onchange={next => (form!.channel_ids = next)} max={view.limits[form.mode].max_channels} disabled={!isAdmin} label="Channels" />
        </SettingRow>
      </Card>

      <Card>
        <SectionTitle icon={Gauge} title="Context and limits" class="mb-5" />
        {#each LIMIT_ROWS as [field, title] (field)}
          {@const standard = defaultOf(field, form.mode)}
          {@const range = limits[field]}
          <SettingRow {title} hint={problems[field] ? `Between ${problems[field]}` : limitHint(field, form.mode)} chips={chipsOf(range[0], range[1], standard)} error={!!problems[field]}>
            <div class="flex items-center gap-2 sm:justify-end">
              <Input bind:value={form[field]} inputmode="numeric" maxlength={7} oninput={restrictTo(onlyDigits, v => (form![field] = v))} aria-label={title} disabled={!isAdmin} class="sm:w-32" />
              <Button variant="ghost" size="icon" aria-label="Back to the default of {title}" title="Back to the default ({standard})" disabled={!isAdmin || form[field] === standard} onclick={() => (form![field] = standard)}>
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
            </div>
          </SettingRow>
        {/each}
      </Card>
    {:else if tab === 'service'}
      <Card>
        <SectionTitle icon={Server} title="AI service" class="mb-5" />
        <SettingRow title="Who answers" hint="Flame's service needs nothing from you but is shared and limited. Bring your own key to lift the limits.">
          <div class="sm:flex sm:justify-end">
            <SegmentedControl
              bind:value={form.mode}
              label="Who answers"
              options={[
                { id: 'flame', label: 'Flame', icon: Zap },
                { id: 'own', label: 'Your own key', icon: KeyRound },
              ]}
            />
          </div>
        </SettingRow>

        {#if form.mode === 'flame'}
          <SettingRow title="Flame's service" hint="Shared by every server. What is left today:">
            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between gap-2">
                <span class="text-zinc-300">{view.flame.model}</span>
                <Badge tone={view.flame.configured ? 'success' : 'danger'}>{view.flame.configured ? 'Ready' : 'No key'}</Badge>
              </div>
              <div>
                <div class="mb-1 flex justify-between text-zinc-400"><span>This server</span><span>{view.flame.guild_used_today} of {view.flame.guild_daily_limit}</span></div>
                <div class="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div class="h-full rounded-full bg-vermilion-400" style="width:{meter(view.flame.guild_used_today, view.flame.guild_daily_limit)}%"></div></div>
              </div>
              <div>
                <div class="mb-1 flex justify-between text-zinc-400"><span>Every server together</span><span>{view.flame.used_today} of {view.flame.daily_limit}</span></div>
                <div class="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div class="h-full rounded-full bg-vermilion-400" style="width:{meter(view.flame.used_today, view.flame.daily_limit)}%"></div></div>
              </div>
            </div>
          </SettingRow>
        {:else}
          <SettingRow title="Service" hint="Any service that speaks the OpenAI chat format. Pick one to fill in its address.">
            <Select
              bind:value={() => (presetId === CUSTOM ? '' : presetId), next => pickPreset(next || CUSTOM)}
              options={view.presets.map(preset => ({ value: preset.id, label: preset.label }))}
              placeholder="Another service"
              label="Service"
              defaulted
              disabled={!isAdmin}
              class="w-full"
            />
          </SettingRow>
          <SettingRow title="Address" hint={problems.base_url ?? 'The base address of the service, ending in /v1 or similar. It must be https and public.'} error={!!problems.base_url}>
            <Input bind:value={form.base_url} maxlength={300} placeholder="https://api.example.com/v1" aria-label="Address" disabled={!isAdmin} />
          </SettingRow>
          <SettingRow title="Model" hint="The name of the model, as the service calls it.">
            <Input bind:value={form.model} maxlength={100} placeholder="gpt-4o-mini" aria-label="Model" disabled={!isAdmin} />
          </SettingRow>
          <SettingRow title="API key" hint={keyHint}>
            <div class="space-y-2">
              <Input bind:value={apiKey} type="password" autocomplete="off" maxlength={500} placeholder={view.has_api_key && !removeKey ? '••••••••' : 'Paste the API key'} aria-label="API key" disabled={!isAdmin || removeKey} />
              {#if isAdmin && view.has_api_key}
                <Button variant="ghost" size="sm" onclick={() => ((removeKey = !removeKey), (apiKey = ''))}>
                  {#if removeKey}<RotateCcw class="h-3.5 w-3.5" />Keep the saved key{:else}<Trash2 class="h-3.5 w-3.5" />Remove the saved key{/if}
                </Button>
              {/if}
            </div>
          </SettingRow>
          {#if isAdmin}
            <SettingRow title="Test" hint={dirty ? 'Save first: the test uses the saved service.' : 'Sends one tiny request to check that the key and the model work.'}>
              <div class="space-y-2">
                <Button variant="secondary" onclick={test} disabled={dirty || testing || !view.has_api_key || !view.base_url || !view.model}>
                  <ShieldCheck class="h-3.5 w-3.5" />{testing ? 'Testing…' : 'Test the service'}
                </Button>
                {#if tested}<p class="text-xs text-emerald-400">It answered "{tested.reply}" in {tested.ms} ms.</p>{/if}
              </div>
            </SettingRow>
          {/if}
        {/if}
      </Card>
    {:else}
      <Card>
        <SectionTitle icon={Brain} title="Behavior" class="mb-5" />
        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <label for="chat-prompt" class="text-xs font-semibold uppercase tracking-wider text-zinc-400">How the bot talks</label>
            {#if isAdmin && form.system_prompt}
              <Button variant="ghost" size="sm" onclick={() => (form!.system_prompt = '')}><RotateCcw class="h-3.5 w-3.5" />Use the default</Button>
            {/if}
          </div>
          <Textarea id="chat-prompt" bind:value={form.system_prompt} rows={6} maxlength={1500} placeholder={view.default_prompt} disabled={!isAdmin} />
          <p class="mt-1.5 text-xs {problems.system_prompt ? 'text-red-400' : 'text-zinc-500'}">
            {problems.system_prompt ?? `Written for the model. {bot} and {server} are filled in. Empty uses the default shown. ${form.system_prompt.length} of 1500.`}
          </p>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Sparkles} title="Parameters" class="mb-5" />
        {#each SAMPLING as [field, title, key] (field)}
          {@const [min, max] = limits[key]}
          {@const standard = defaultOf(field, form.mode)}
          <SettingRow
            {title}
            hint={problems[field] ? `Between ${min} and ${max}` : EXPLAIN[field]}
            chips={chipsOf(min, max, standard, field === 'max_tokens' && form.mode === 'flame' ? ['Flame keeps it short'] : [])}
            error={!!problems[field]}
          >
            <div class="flex items-center gap-2 sm:justify-end">
              <Input
                bind:value={form[field]}
                inputmode="decimal"
                maxlength={6}
                oninput={restrictTo(field === 'max_tokens' ? onlyDigits : onlyDecimalSigned, v => (form![field] = v))}
                aria-label={title}
                disabled={!isAdmin}
                class="sm:w-32"
              />
              <Button variant="ghost" size="icon" aria-label="Back to the default of {title}" title="Back to the default ({standard})" disabled={!isAdmin || form[field] === standard} onclick={() => (form![field] = standard)}>
                <RotateCcw class="h-3.5 w-3.5" />
              </Button>
            </div>
          </SettingRow>
        {/each}
      </Card>
    {/if}

    {#if isAdmin}
      <div class="flex justify-end">
        <SaveButton onclick={save} disabled={!dirty || invalid} {saving} />
      </div>
    {/if}
  {/if}
</div>
