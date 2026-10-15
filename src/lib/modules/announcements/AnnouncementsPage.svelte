<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelChip from '$lib/components/ChannelChip.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import EmbedPreview, { type Mention } from '$lib/components/EmbedPreview.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import { api, type AnnouncementEntry, type AnnouncementTemplateEntry, type AnnouncementTemplates, type DiscordChannel, type DiscordRole } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlNumber, urlParam } from '$lib/url-param';
  import { label, td, th, toneText } from '$lib/ui';
  import { Check, ExternalLink, FileText, Info, Megaphone, Pencil, Plus, Send, Trash2, ScrollText } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import AnnouncementForm from './AnnouncementForm.svelte';
  import { draftOf, emptyDraft, fieldsOf, fill, hasContent, labelOf, MAX_VARIABLES, variablesIn, type Draft } from './draft';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  // Where the person is lives in the address: the tab and the page of the history.
  const tabParam = urlParam('tab', 'compose');
  const tab = $derived(tabParam.value);
  const historyPageParam = urlNumber('page');
  const historyPage = $derived(historyPageParam.value);
  let info = $state(false);
  let roles: DiscordRole[] = $state([]);
  let channels: DiscordChannel[] = $state([]);
  let templates: AnnouncementTemplates | null = $state(null);

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const channelOf = (id: string | null) => channels.find(c => c.id === id);

  // ---- compose
  let draft: Draft = $state(emptyDraft());
  let channelId = $state('');
  let values: Record<string, string> = $state({});
  let usedTemplate: string | null = $state(null);
  let pickedTemplate = $state('');
  let sendAsk = $state(false);
  let sending = $state(false);
  let saveAs = $state(false);
  let saveAsName = $state('');
  let savingAs = $state(false);

  const vars = $derived(variablesIn(draft));
  const tooManyVars = (source: Draft) => variablesIn(source).length > MAX_VARIABLES;
  const filled = $derived(fill(draft, values));
  const missing = $derived(vars.filter(name => !values[name]?.trim()));
  const canSend = $derived(hasContent(filled) && !!channelId && !missing.length && !sending);
  const pings = $derived([...(filled.mention_everyone ? ['@everyone'] : []), ...filled.mention_role_ids.map(id => `@${roles.find(r => r.id === id)?.name ?? 'deleted role'}`)]);

  function useTemplate(template: AnnouncementTemplateEntry) {
    draft = draftOf(template);
    channelId = template.channel_id ?? '';
    values = {};
    usedTemplate = template.name;
    pickedTemplate = template.id;
    tabParam.value = 'compose';
  }

  function pickTemplate() {
    const template = templates?.templates.find(t => t.id === pickedTemplate);
    if (template) useTemplate(template);
  }

  function reset() {
    draft = emptyDraft();
    channelId = '';
    values = {};
    usedTemplate = null;
    pickedTemplate = '';
  }

  async function send() {
    sending = true;
    try {
      await api.announcements.send(guildId, { ...fieldsOf(filled), channel_id: channelId, template_name: usedTemplate });
      toast('success', 'Announcement sent', `It is in ${channelOf(channelId) ? `#${channelOf(channelId)!.name}` : 'the channel'} and listed in History.`);
      sendAsk = false;
      historyLoaded = false;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      sending = false;
    }
  }

  // ---- use a template: a modal asks for what it needs (its values and a channel), then sends it
  let useTarget: AnnouncementTemplateEntry | null = $state(null);
  let useValues: Record<string, string> = $state({});
  let useChannel = $state('');
  let useSending = $state(false);

  const useDraft = $derived.by(() => {
    const target: AnnouncementTemplateEntry | null = useTarget;
    return target ? fill(draftOf(target), useShown(target)) : null;
  });
  const LINK = /^https?:\/\/\S+$/i;
  const useMissing = $derived.by((): string[] => {
    const target: AnnouncementTemplateEntry | null = useTarget;
    return target ? target.variables.filter(name => !useValues[name]?.trim() || (target.variable_types?.[name] === 'link' && !LINK.test(useValues[name].trim()))) : [];
  });
  const useMentions = $derived<Mention[]>(
    useDraft
      ? [
          ...(useDraft.mention_everyone ? [{ name: '@everyone' }] : []),
          ...useDraft.mention_role_ids.map(id => {
            const role = roles.find(r => r.id === id);
            return { name: `@${role?.name ?? 'deleted role'}`, color: role?.color };
          }),
        ]
      : [],
  );

  // What each value reads as in the preview (a role or channel by name) and what is sent (a mention, as the bot does).
  const useShown = (target: AnnouncementTemplateEntry) =>
    Object.fromEntries(
      target.variables.map(name => {
        const value = useValues[name] ?? '';
        const type = target.variable_types?.[name];
        if (type === 'role') return [name, value ? `@${roles.find(r => r.id === value)?.name ?? 'deleted role'}` : ''];
        if (type === 'channel') return [name, value ? `#${channelOf(value)?.name ?? 'deleted channel'}` : ''];
        if (type === 'user') return [name, value ? `<@${value}>` : ''];
        return [name, value];
      }),
    );
  const useSent = (target: AnnouncementTemplateEntry) =>
    Object.fromEntries(
      target.variables.map(name => {
        const value = (useValues[name] ?? '').trim();
        const type = target.variable_types?.[name];
        return [name, !value ? '' : type === 'role' ? `<@&${value}>` : type === 'channel' ? `<#${value}>` : type === 'user' ? `<@${value}>` : value];
      }),
    );

  function openUse(template: AnnouncementTemplateEntry) {
    useValues = {};
    useChannel = template.channel_id ?? '';
    useTarget = template;
  }

  async function sendUse() {
    const target: AnnouncementTemplateEntry | null = useTarget;
    if (!target || !useDraft || useSending) return;
    useSending = true;
    try {
      await api.announcements.send(guildId, { ...fieldsOf(fill(draftOf(target), useSent(target))), channel_id: useChannel, template_name: target.name });
      toast('success', 'Announcement sent', `It is in ${channelOf(useChannel) ? `#${channelOf(useChannel)!.name}` : 'the channel'} and listed in History.`);
      useTarget = null;
      historyLoaded = false;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      useSending = false;
    }
  }

  async function saveAsTemplate() {
    if (savingAs) return;
    savingAs = true;
    try {
      templates = await api.announcements.createTemplate(guildId, { ...fieldsOf(draft), name: saveAsName, channel_id: channelId || null });
      toast('success', 'Template saved', 'Switch on /announce from the Slash page to send it from Discord.');
      usedTemplate = saveAsName.trim();
      saveAs = false;
      saveAsName = '';
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingAs = false;
    }
  }

  // ---- templates
  let addingTemplate = $state(false);
  let newDraft: Draft = $state(emptyDraft());
  let newName = $state('');
  let newTypes: Record<string, string> = $state({});
  let newDescriptions: Record<string, string> = $state({});
  let newPlaceholders: Record<string, string> = $state({});
  let newChannel = $state('');
  let editTemplate: AnnouncementTemplateEntry | null = $state(null);
  let editDraft: Draft = $state(emptyDraft());
  let editName = $state('');
  let editTypes: Record<string, string> = $state({});
  let editDescriptions: Record<string, string> = $state({});
  let editPlaceholders: Record<string, string> = $state({});
  let editChannel = $state('');
  let savingTemplate = $state(false);
  let removeTemplateTarget: AnnouncementTemplateEntry | null = $state(null);
  let removingTemplate = $state(false);
  const full = $derived.by(() => {
    const current: AnnouncementTemplates | null = templates;
    return !!current && current.templates.length >= current.max_templates;
  });

  function openEditTemplate(template: AnnouncementTemplateEntry) {
    if (editTemplate?.id === template.id) return void (editTemplate = null);
    editTemplate = template;
    editDraft = draftOf(template);
    editName = template.name;
    editTypes = { ...(template.variable_types ?? {}) };
    editDescriptions = { ...(template.variable_descriptions ?? {}) };
    editPlaceholders = { ...(template.variable_placeholders ?? {}) };
    editChannel = template.channel_id ?? '';
  }

  async function saveTemplate(existing: AnnouncementTemplateEntry | null) {
    if (savingTemplate) return;
    savingTemplate = true;
    const body = existing ? { ...fieldsOf(editDraft), name: editName, channel_id: editChannel || null, variable_types: editTypes, variable_descriptions: editDescriptions, variable_placeholders: editPlaceholders } : { ...fieldsOf(newDraft), name: newName, channel_id: newChannel || null, variable_types: newTypes, variable_descriptions: newDescriptions, variable_placeholders: newPlaceholders };
    try {
      templates = existing ? await api.announcements.updateTemplate(guildId, existing.id, body) : await api.announcements.createTemplate(guildId, body);
      toast('success', existing ? 'Template saved' : 'Template added', existing ? undefined : 'Switch on /announce from the Slash page to send it from Discord.');
      if (existing) editTemplate = null;
      else {
        addingTemplate = false;
        newDraft = emptyDraft();
        newName = '';
        newTypes = {};
        newDescriptions = {};
        newPlaceholders = {};
        newChannel = '';
      }
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingTemplate = false;
    }
  }

  async function removeTemplate() {
    if (!removeTemplateTarget) return;
    removingTemplate = true;
    try {
      templates = await api.announcements.removeTemplate(guildId, removeTemplateTarget.id);
      toast('success', 'Template removed', 'The announcements already sent from it stay in History.');
      removeTemplateTarget = null;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      removingTemplate = false;
    }
  }

  // ---- history
  let history: AnnouncementEntry[] = $state([]);
  let historyLimit = $state(10);
  let historyTotal = $state(0);
  let historyLoaded = $state(false);
  let historyLoading = $state(false);
  let editEntry: AnnouncementEntry | null = $state(null);
  let editEntryDraft: Draft = $state(emptyDraft());
  let savingEntry = $state(false);
  let deleteTarget: AnnouncementEntry | null = $state(null);
  let deleting = $state(false);

  async function loadHistory() {
    historyLoading = true;
    try {
      const res = await api.announcements.list(guildId, { page: historyPage, limit: historyLimit });
      history = res.announcements;
      historyTotal = res.pagination.total;
      historyLoaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      historyLoading = false;
    }
  }
  $effect(() => {
    if (tab === 'history') {
      void historyPage;
      untrack(() => void loadHistory());
    }
  });

  async function saveEntry() {
    if (!editEntry || savingEntry) return;
    savingEntry = true;
    try {
      await api.announcements.edit(guildId, editEntry.id, fieldsOf(editEntryDraft));
      toast('success', 'Announcement edited', 'The message in Discord is updated.');
      editEntry = null;
      await loadHistory();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingEntry = false;
    }
  }

  async function deleteEntry() {
    if (!deleteTarget) return;
    deleting = true;
    try {
      await api.announcements.remove(guildId, deleteTarget.id);
      toast('success', 'Announcement deleted', 'The message is removed from Discord.');
      deleteTarget = null;
      await loadHistory();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      deleting = false;
    }
  }

  const entryActions = (entry: AnnouncementEntry): RowMenuItem[] => [
    { label: 'Open in Discord', icon: ExternalLink, onclick: () => window.open(`https://discord.com/channels/${guildId}/${entry.channel_id}/${entry.message_id}`, '_blank', 'noreferrer') },
    {
      label: 'Edit',
      icon: Pencil,
      onclick: () => {
        if (editEntry?.id === entry.id) return void (editEntry = null);
        editEntry = entry;
        editEntryDraft = draftOf(entry);
      },
    },
    { label: 'Delete', icon: Trash2, danger: true, onclick: () => (deleteTarget = entry) },
  ];

  const snippet = (entry: AnnouncementEntry) => entry.title || entry.body?.replace(/\s+/g, ' ') || entry.content?.replace(/\s+/g, ' ') || '(image only)';

  // The hint follows the tab: each one explains what is in front of the person, not the whole module.
  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    compose: {
      title: 'How an announcement is sent',
      steps: [
        { text: 'The message text and the embed are posted by the bot in the channel you pick. The preview is what members will see.' },
        { text: 'Mentions go in a line above the embed. Only the roles you chose can be pinged, and only an admin can ping @everyone: nothing else in the text can notify anyone.' },
        { text: 'A {name} in the message, title, body, footer or fields becomes a box to fill in before sending. The same message can be saved as a template to send again.' },
        { text: 'Every send is recorded in History with its message, so it can be edited or deleted later.' },
      ],
    },
    templates: {
      title: 'How templates work',
      steps: [
        { text: 'A template is a saved announcement. The {names} in its text are its variables (up to 3), asked for each time it is sent.' },
        { text: 'Admins manage templates; moderators and admins send them. Switch on the command from the Slash page first.', command: '/announce template:<name> [channel:<where>]' },
        { text: 'A template with no variables is sent at once. With variables, the bot answers with a Fill in button that opens a form. It goes to the template\'s channel, or the one you give.' },
      ],
    },
    history: {
      title: 'What History keeps',
      steps: [
        { text: 'Each announcement sent, from the dashboard or with /announce, is listed with its channel, who sent it and the template it came from.' },
        { text: 'Editing changes the embed of the message in Discord. It never pings again, so the mentions stay as they were.' },
        { text: 'Deleting removes the message from Discord and marks the entry deleted. Uninstalling the module deletes the history, not the messages.' },
      ],
    },
  };
  const hint = $derived(HINTS[tab] ?? HINTS.compose);
  // Info is for views with nothing to add: the templates tab has its Add button.
  const hasInfo = $derived(tab !== 'templates');

  onMount(async () => {
    const [roleList, channelList, templateList] = await Promise.allSettled([api.roles(guildId), api.channels(guildId), api.announcements.templates(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (templateList.status === 'fulfilled') templates = templateList.value;
    else toast('error', templateList.reason?.message ?? 'Could not load the templates');
  });
</script>

<PageHeader module="announcements" description="Write announcements, save them as templates and send them" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tabParam.value}
      tabs={[
        { id: 'compose', label: 'Compose', icon: Megaphone },
        { id: 'templates', label: 'Templates', icon: FileText, count: templates ? templates.templates.length : null },
        { id: 'history', label: 'History', icon: ScrollText, count: historyLoaded ? historyTotal : null },
      ]}
    />
    <div class="flex items-center gap-3">
      {#if tab === 'templates' && isAdmin}
        {#if templates}
          <span class="text-xs text-zinc-500">{templates.templates.length} of {templates.max_templates} templates</span>
          <Button variant="primary" disabled={full && !addingTemplate} onclick={() => (addingTemplate = !addingTemplate)}><Plus class="w-3.5 h-3.5" />Add template</Button>
        {:else}
          <ControlSkeleton class="w-36" h="h-8" />
          <ControlSkeleton class="w-36" h="h-8" />
        {/if}
      {/if}
      {#if hasInfo}
        <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
      {/if}
    </div>
  </div>

  <InfoPanel show={info && hasInfo} title={hint.title} tone="teal" steps={hint.steps} />

  {#if templates}<WarningBanner warnings={templates.warnings} />{/if}

  {#if tab === 'compose'}
    <Card>
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={Megaphone} title="New announcement" />
        {#if templates}
          {#if templates.templates.length}
            <Select
              bind:value={pickedTemplate}
              onchange={pickTemplate}
              options={templates.templates.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Start from a template"
              label="Template"
              class="w-56"
            />
          {/if}
        {:else}
          <ControlSkeleton class="w-56" />
        {/if}
      </div>

      <AnnouncementForm bind:draft bind:channelId {roles} {channels} canEveryone={isAdmin} />

      {#if vars.length}
        <div class="mt-5 rounded-xl bg-zinc-800/40 p-4">
          <p class="mb-3 text-xs text-zinc-400">
            {missing.length === 1 ? '1 value left to fill in' : missing.length ? `${missing.length} values left to fill in` : 'All values filled in'}: they replace the <span class="font-mono">{'{names}'}</span> in the message.
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each vars as name (name)}
              <div>
                <span class={label}>{name}</span>
                <Input bind:value={() => values[name] ?? '', next => (values[name] = next)} maxlength={200} aria-label={name} />
              </div>
            {/each}
          </div>
        </div>
      {:else if usedTemplate && hasContent(filled)}
        <p class="mt-5 flex items-center gap-2 rounded-xl bg-zinc-800/40 px-4 py-3 text-xs {channelId ? 'text-emerald-400' : 'text-zinc-400'}">
          <Check class="h-4 w-4 shrink-0" />
          {channelId ? 'Nothing to fill in: ready to publish.' : 'Nothing to fill in. Pick a channel to publish.'}
        </p>
      {/if}

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4">
        <Button variant="ghost" onclick={reset}>Reset</Button>
        <div class="flex items-center gap-2">
          {#if isAdmin}
            <Button variant="secondary" disabled={!hasContent(draft) || full || tooManyVars(draft)} onclick={() => (saveAs = true)} title={full ? 'The template limit is reached' : tooManyVars(draft) ? `A template can have up to ${MAX_VARIABLES} variables` : undefined}>
              <FileText class="h-3.5 w-3.5" />Save as template
            </Button>
          {/if}
          <Button variant="primary" disabled={!canSend} onclick={() => (sendAsk = true)}><Send class="h-3.5 w-3.5" />Send announcement</Button>
        </div>
      </div>
    </Card>
  {:else if tab === 'templates'}
    {#if isAdmin && addingTemplate}
      <div transition:slide={{ duration: 220, easing: cubicOut }}>
        <Card>
          <SectionTitle icon={Plus} title="Add a template" class="mb-4" />
          <AnnouncementForm bind:draft={newDraft} bind:channelId={newChannel} bind:name={newName} bind:types={newTypes} bind:descriptions={newDescriptions} bind:placeholders={newPlaceholders} showName {roles} {channels} canEveryone={isAdmin} templateHint />
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onclick={() => (addingTemplate = false)}>Cancel</Button>
            <SaveButton onclick={() => saveTemplate(null)} disabled={!newName.trim() || !hasContent(newDraft) || tooManyVars(newDraft)} saving={savingTemplate} />
          </div>
        </Card>
      </div>
    {/if}

    {#if !templates}
      <div class="space-y-3" aria-hidden="true">
        {#each [0, 1] as n (n)}
          <Card>
            <div class="flex items-center gap-4">
              <div class="min-w-0 flex-1 space-y-2">
                <div class="h-3.5 w-40 rounded bg-zinc-800/40 animate-pulse"></div>
                <div class="h-3 w-64 rounded bg-zinc-800/30 animate-pulse"></div>
              </div>
              <div class="h-7 w-24 shrink-0 rounded-lg bg-zinc-800/30 animate-pulse"></div>
            </div>
          </Card>
        {/each}
      </div>
    {:else if templates.templates.length === 0}
      <EmptyState kind="modules" title="No templates yet" description="Save an announcement from the Compose tab, or add one here, to send it again with /announce." />
    {:else}
      <div class="space-y-3">
        {#each templates.templates as template (template.id)}
          <Card>
            <div class="flex items-center gap-4">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-zinc-100">{template.name}</p>
                <p class="mt-1 truncate text-xs text-zinc-400">{template.title || template.body?.replace(/\s+/g, ' ') || template.content?.replace(/\s+/g, ' ') || '(image only)'}</p>
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  {#each template.variables as name (name)}
                    <span class="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-xs {toneText.teal}">{'{'}{name}{'}'}</span>
                  {/each}
                  {#if template.channel_id}<ChannelChip channel={channelOf(template.channel_id)} />{/if}
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <Button variant="soft" size="sm" onclick={() => openUse(template)}><Send class="h-3.5 w-3.5" />Use</Button>
                {#if isAdmin}
                  <Button variant="ghost" size="icon" aria-label="Edit {template.name}" title="Edit" onclick={() => openEditTemplate(template)}><Pencil class="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Remove {template.name}" title="Remove" onclick={() => (removeTemplateTarget = template)}>
                    <Trash2 class="h-3.5 w-3.5 text-red-400" />
                  </Button>
                {/if}
              </div>
            </div>
            {#if isAdmin && editTemplate?.id === template.id}
              <div class="mt-5 border-t border-zinc-800/60 pt-5" transition:slide={{ duration: 220, easing: cubicOut }}>
                <SectionTitle icon={Pencil} title="Edit {template.name}" class="mb-4" />
                <AnnouncementForm bind:draft={editDraft} bind:channelId={editChannel} bind:name={editName} bind:types={editTypes} bind:descriptions={editDescriptions} bind:placeholders={editPlaceholders} showName {roles} {channels} canEveryone={isAdmin} templateHint />
                <div class="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" onclick={() => (editTemplate = null)}>Cancel</Button>
                  <SaveButton onclick={() => saveTemplate(template)} disabled={!editName.trim() || !hasContent(editDraft) || tooManyVars(editDraft)} saving={savingTemplate} />
                </div>
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  {:else}
    {#if historyLoaded && historyTotal === 0}
      <EmptyState kind="log" title="Nothing sent yet" description="Announcements you send, from here or with /announce, are listed here." />
    {:else}
      <Card flush>
        {#if !historyLoaded}
          <TableSkeleton
            columns={['w-16', 'w-48', 'flex-1', 'w-48', 'w-64', 'w-32', 'w-16']}
            headings={['#', 'When', 'Announcement', 'Channel', 'Sent by', 'Status', '']}
            kinds={['bar', 'bar', 'bar', 'bar', 'actor', 'pill', 'action']}
            rows={5}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class="{th} w-48">When</th>
                <th class={th}>Announcement</th>
                <th class="{th} w-48">Channel</th>
                <th class="{th} w-64">Sent by</th>
                <th class="{th} w-32">Status</th>
                <th class="{th} w-16"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each history as entry, i (entry.id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{(historyPage - 1) * historyLimit + i + 1}</td>
                  <td class="{cell} text-zinc-500 whitespace-nowrap">{when(entry.created_at)}</td>
                  <td class="{cell} text-zinc-200">
                    <p class="truncate">{snippet(entry)}</p>
                    {#if entry.template_name}<p class="truncate text-xs text-zinc-500">From {entry.template_name}</p>{/if}
                  </td>
                  <td class={cell}><ChannelChip channel={channelOf(entry.channel_id)} /></td>
                  <td class={cell}>{#if entry.sent_by}<ActorCell actor={entry.sent_by} />{/if}</td>
                  <td class={cell}><Badge tone={entry.status === 'sent' ? 'success' : 'neutral'}>{entry.status === 'sent' ? 'Sent' : 'Deleted'}</Badge></td>
                  <td class="{cell} text-right">{#if entry.status === 'sent'}<RowMenu label="Actions for this announcement" items={entryActions(entry)} />{/if}</td>
                </tr>
                {#if editEntry?.id === entry.id}
                  <tr>
                    <td colspan="7" class="p-0">
                      <div class="border-t border-zinc-800/40 bg-zinc-800/10 p-5" transition:slide={{ duration: 220, easing: cubicOut }}>
                        <SectionTitle icon={Pencil} title="Edit this announcement" class="mb-4" />
                        <AnnouncementForm bind:draft={editEntryDraft} {roles} {channels} showChannel={false} showMentions={false} />
                        <div class="mt-5 flex justify-end gap-2">
                          <Button variant="ghost" onclick={() => (editEntry = null)}>Cancel</Button>
                          <SaveButton onclick={saveEntry} disabled={!hasContent(editEntryDraft)} saving={savingEntry} />
                        </div>
                      </div>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
          <Pagination
            page={historyPage}
            limit={historyLimit}
            total={historyTotal}
            onPage={p => (historyPageParam.value = p)}
            onLimit={l => ((historyLimit = l), (historyPageParam.value = 1), loadHistory())}
            disabled={historyLoading}
          />
        {/if}
      </Card>
    {/if}
  {/if}
</div>

<ConfirmModal
  show={sendAsk}
  title="Send this announcement?"
  confirmLabel="Send"
  busyLabel="Sending…"
  busy={sending}
  tone="primary"
  icon={Send}
  onConfirm={send}
  onClose={() => (sendAsk = false)}
>
  It is posted in <span class="text-zinc-200">{channelOf(channelId) ? `#${channelOf(channelId)!.name}` : 'the channel'}</span>
  {#if pings.length}and notifies <span class="text-zinc-200">{pings.join(', ')}</span>{:else}without notifying anyone{/if}. Once sent it is in History, where it can be edited or deleted.
</ConfirmModal>

<Modal show={!!useTarget} wide onClose={() => !useSending && (useTarget = null)}>
  {#if useTarget && useDraft}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100"><Send class="w-4 h-4 shrink-0 {toneText.teal}" />{useTarget.name}</h3>
    <p class="mt-2 text-xs {useMissing.length ? 'text-zinc-400' : useChannel ? 'text-emerald-400' : 'text-zinc-400'}">
      {#if useTarget.variables.length && useMissing.length}
        Fill in {useMissing.length === 1 ? 'the value' : 'the values'} below. {useMissing.length === 1 ? 'It replaces' : 'They replace'} the <span class="font-mono">{'{names}'}</span> in the message.
      {:else if !useChannel}
        {useTarget.variables.length ? 'All values filled in.' : 'Nothing to fill in.'} Pick a channel to publish.
      {:else}
        {useTarget.variables.length ? 'All values filled in: ready to publish.' : 'Nothing to fill in: ready to publish.'}
      {/if}
    </p>

    {#if useTarget.variables.length}
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        {#each useTarget.variables as name (name)}
          <div>
            <span class={label}>{labelOf(name)}</span>
            {#if useTarget.variable_descriptions?.[name]}<p class="-mt-0.5 mb-1.5 text-[11px] text-zinc-500">{useTarget.variable_descriptions?.[name]}</p>{/if}
            {#if useTarget.variable_types?.[name] === 'role'}
              <RoleSelect {roles} bind:value={() => useValues[name] ?? '', next => (useValues[name] = next)} label={name} class="w-full" />
            {:else if useTarget.variable_types?.[name] === 'channel'}
              <ChannelPicker {channels} bind:value={() => useValues[name] ?? '', next => (useValues[name] = next)} none="Pick a channel" label={name} class="w-full" />
            {:else}
              <Input
                bind:value={() => useValues[name] ?? '', next => (useValues[name] = next)}
                maxlength={200}
                inputmode={useTarget.variable_types?.[name] === 'number' ? 'decimal' : undefined}
                placeholder={useTarget.variable_placeholders?.[name] || (useTarget.variable_types?.[name] === 'user' ? 'Member ID' : useTarget.variable_types?.[name] === 'number' ? 'A number' : useTarget.variable_types?.[name] === 'link' ? 'https://example.com' : '')}
                aria-label={name}
              />
              {#if useTarget.variable_types?.[name] === 'link' && useValues[name]?.trim() && !LINK.test(useValues[name].trim())}
                <p class="mt-1 text-[11px] text-red-400">It must start with http:// or https://</p>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4">
      <span class={label}>Channel</span>
      <ChannelPicker {channels} bind:value={useChannel} none="Pick a channel" label="Channel" class="w-full" />
    </div>

    <div class="mt-4 space-y-2">
      <span class={label}>Preview</span>
      <EmbedPreview
        content={useDraft.content}
        title={useDraft.title}
        body={useDraft.body}
        color={useDraft.color}
        imageUrl={useDraft.image_url}
        thumbnailUrl={useDraft.thumbnail_url}
        footer={useDraft.footer}
        fields={useDraft.fields}
        mentions={useMentions}
        mentionNewline={useDraft.mention_newline}
      />
    </div>

    <div class="mt-5 flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (useTarget = null)} disabled={useSending}>Cancel</Button>
      <Button variant="primary" disabled={!!useMissing.length || !useChannel || useSending} onclick={sendUse}><Send class="h-3.5 w-3.5" />{useSending ? 'Sending…' : 'Send'}</Button>
    </div>
  {/if}
</Modal>

<Modal show={saveAs} onClose={() => !savingAs && (saveAs = false)}>
  <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100"><FileText class="w-4 h-4 shrink-0 {toneText.teal}" />Save as template</h3>
  <p class="mt-3 text-xs leading-relaxed text-zinc-400">The message is saved as it is written, with its <span class="font-mono">{'{names}'}</span> left in, so they can be filled in each time.</p>
  <div class="mt-3">
    <span class={label}>Name</span>
    <Input bind:value={saveAsName} maxlength={50} placeholder="Weekly update" aria-label="Template name" />
  </div>
  <div class="mt-5 flex justify-end gap-2">
    <Button variant="ghost" onclick={() => (saveAs = false)} disabled={savingAs}>Cancel</Button>
    <SaveButton onclick={saveAsTemplate} disabled={!saveAsName.trim() || tooManyVars(draft)} saving={savingAs} />
  </div>
</Modal>

<ConfirmModal
  show={!!removeTemplateTarget}
  title="Remove {removeTemplateTarget?.name ?? 'this template'}?"
  confirmLabel="Remove"
  busyLabel="Removing…"
  busy={removingTemplate}
  icon={Trash2}
  onConfirm={removeTemplate}
  onClose={() => (removeTemplateTarget = null)}
>
  /announce can no longer send it. The announcements already sent from it stay in History and in Discord.
</ConfirmModal>

<ConfirmModal
  show={!!deleteTarget}
  title="Delete this announcement?"
  confirmLabel="Delete"
  busyLabel="Deleting…"
  busy={deleting}
  icon={Trash2}
  onConfirm={deleteEntry}
  onClose={() => (deleteTarget = null)}
>
  The message is removed from Discord for everyone and the entry is marked deleted. This cannot be undone.
</ConfirmModal>
