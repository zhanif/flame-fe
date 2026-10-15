<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import ChipPicker from '$lib/components/ChipPicker.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import InfoPanel from '$lib/components/InfoPanel.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import RoleChip from '$lib/components/RoleChip.svelte';
  import RoleSelect from '$lib/components/RoleSelect.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import {
    api,
    type DiscordRole,
    type FileCollectionEntry,
    type FileCollections,
    type FileKind,
    type FileSubmissionGroup,
    type FileSubmissionRow,
  } from '$lib/api/endpoints';
  import { onlyCommandName, onlyDigits, restrictTo } from '$lib/number-input';
  import { router } from '$lib/stores/router.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, label, td, th, toneText } from '$lib/ui';
  import { Check, ChevronRight, Eye, Infinity as InfinityIcon, Info, Pencil, Plus, Trash2, X } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  const KIND_ITEMS = [
    { id: 'image', name: 'Images' },
    { id: 'video', name: 'Videos' },
    { id: 'audio', name: 'Audio' },
    { id: 'other', name: 'Other Files' },
  ];
  const kindName = (kind: FileKind) => KIND_ITEMS.find(item => item.id === kind)?.name ?? kind;

  let data: FileCollections | null = $state(null);
  let info = $state(false);
  let roles: DiscordRole[] = $state([]);

  // Where the person is: the collections, one collection's rounds, or one round's entries.
  // All of it lives in the URL (`?c=<collection>&tag=<round>&status=&page=&gp=&e=<entry>`), so a link or a reload
  // opens the same place.
  const openId = $derived(router.query.get('c'));
  const openTag = $derived(router.query.get('tag'));
  const urlStatus = $derived(router.query.get('status') ?? '');
  const page = $derived(Number(router.query.get('page')) || 1);
  const groupPage = $derived(Number(router.query.get('gp')) || 1);
  const previewId = $derived(router.query.get('e'));
  // How many rows the last visit had, so the skeleton has the same number (a reload or a link included).
  const recall = (key: string, fallback: number): number => {
    try {
      return Math.min(10, Math.max(1, Number(sessionStorage.getItem(`flame:fs:${guildId}:${key}`)) || fallback));
    } catch {
      return fallback;
    }
  };
  const remember = (key: string, count: number) => {
    try {
      sessionStorage.setItem(`flame:fs:${guildId}:${key}`, String(count));
    } catch {
      // Only a hint for the skeleton.
    }
  };
  const go = (patch: Record<string, string | null>) => router.setQuery(patch);
  const opened = $derived.by(() => {
    const current: FileCollections | null = data;
    return current?.collections.find(c => c.id === openId) ?? null;
  });

  // The form, for a new collection or for the one being edited.
  let panel = $state(false);
  let editing: FileCollectionEntry | null = $state(null);
  let name = $state('');
  let commandName = $state('');
  let commandTouched = $state(false);
  let description = $state('');
  let kinds: string[] = $state(['image']);
  let grouped = $state(false);
  let maxFiles = $state('5');
  let maxEntries = $state(''); // empty is unlimited
  let countRejected = $state(true);
  let allowUpvotes = $state(false);
  let requireReason = $state(true);
  let showReason = $state(true);
  let approveRole = $state('');
  let rejectRole = $state('');
  let reaction = $state('');
  let saving = $state(false);
  let removeTarget: FileCollectionEntry | null = $state(null);
  let removing = $state(false);

  // The rounds of the open collection.
  let groups: FileSubmissionGroup[] = $state([]);
  let groupLimit = $state(10);
  let groupTotal = $state(0);
  let groupsLoaded = $state(false);

  // The entries of the open round.
  let rows: FileSubmissionRow[] = $state([]);
  let limit = $state(10);
  let total = $state(0);
  let statusFilter = $state(''); // the filter box; the URL is where it is kept
  let rowsLoaded = $state(false);
  let loading = $state(false);

  // Reviewing: the entry shown large, and the one being rejected.
  let rejecting: FileSubmissionRow | null = $state(null);
  let reason = $state('');
  let upvotes = $state('');
  let working = $state(false);
  const previewRow = $derived(rows.find(r => r.id === previewId) ?? null);

  const cell = td.replace('h-11', 'h-20');
  const rowCell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const short = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const roleOf = (id: string | null) => (id ? roles.find(r => r.id === id) : undefined);
  const isImage = (type: string | null) => !!type?.startsWith('image/');
  const isVideo = (type: string | null) => !!type?.startsWith('video/');
  const isAudio = (type: string | null) => !!type?.startsWith('audio/');
  const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' } as const;
  const rejectNeedsReason = $derived(opened?.require_reject_reason ?? true);
  // What the skeletons expect: the rounds list already says how many entries a round has (and per status), a
  // direct link falls back to what the last visit showed.
  const entryRows = $derived.by(() => {
    const known = groups.find(g => g.tag === openTag);
    if (known) return Math.max(1, Math.min(limit, urlStatus ? known[urlStatus as 'pending' | 'approved' | 'rejected'] : known.total));
    return Math.min(limit, recall(`rows:${openId}|${openTag}|${urlStatus}`, 3));
  });
  const groupRows = $derived(Math.min(groupLimit, recall(`groups:${openId}`, 3)));
  const collectionRows = $derived(recall('collections', 2));
  const full = $derived.by(() => {
    const current: FileCollections | null = data;
    return !!current && current.collections.length >= current.max_collections;
  });

  // Until the command name is edited by hand it follows the name: "Weekly Contest" gives "weekly-contest".
  $effect(() => {
    if (commandTouched || editing) return;
    commandName = onlyCommandName(name.trim().toLowerCase().replace(/\s+/g, '-'));
  });

  function openPanel(collection: FileCollectionEntry | null) {
    editing = collection;
    name = collection?.name ?? '';
    commandName = collection?.command_name ?? '';
    commandTouched = !!collection;
    description = collection?.description ?? '';
    kinds = collection?.file_types ?? ['image'];
    grouped = collection?.entry_style === 'grouped';
    maxFiles = String(collection?.max_files ?? 5);
    maxEntries = collection?.max_entries ? String(collection.max_entries) : '';
    countRejected = collection?.count_rejected ?? true;
    allowUpvotes = collection?.allow_upvotes ?? false;
    requireReason = collection?.require_reject_reason ?? true;
    showReason = collection?.show_reject_reason ?? true;
    approveRole = collection?.approve_role_id ?? '';
    rejectRole = collection?.reject_role_id ?? '';
    reaction = collection?.publish_reaction ?? '';
    panel = true;
  }

  async function save() {
    if (saving) return;
    saving = true;
    const input = {
      name,
      command_name: commandName,
      description: description.trim() || null,
      file_types: kinds as FileKind[],
      entry_style: grouped ? ('grouped' as const) : ('separate' as const),
      max_files: Number(maxFiles) || 0,
      max_entries: maxEntries ? Number(maxEntries) : null,
      count_rejected: countRejected,
      allow_upvotes: allowUpvotes,
      require_reject_reason: requireReason,
      show_reject_reason: showReason,
      approve_role_id: approveRole || null,
      reject_role_id: rejectRole || null,
      publish_reaction: reaction.trim() || null,
    };
    try {
      data = editing ? await api.fileSubmissions.update(guildId, editing.id, input) : await api.fileSubmissions.create(guildId, input);
      remember('collections', data.collections.length);
      toast('success', editing ? 'Collection saved' : 'Collection added', `Switch on /${commandName} from the Slash page so staff can post panels.`);
      panel = false;
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
      data = await api.fileSubmissions.remove(guildId, removeTarget.id);
      remember('collections', data.collections.length);
      toast('success', 'Collection removed', `Its panels and entries are removed too. Remove /${removeTarget.command_name} from the Slash page.`);
      removeTarget = null;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      removing = false;
    }
  }

  const openCollection = (collection: FileCollectionEntry) => {
    panel = false;
    go({ c: collection.id, tag: null, status: null, page: null, gp: null, e: null });
  };
  // Each level has its own hint, so it starts closed when the person moves between them.
  $effect(() => {
    void [openId, openTag];
    untrack(() => (info = false));
  });
  const openRound = (tag: string) => go({ tag, status: null, page: null, e: null });
  const closeRound = () => go({ tag: null, status: null, page: null, e: null });
  const closeCollection = () => go({ c: null, tag: null, status: null, page: null, gp: null, e: null });
  const closePreview = () => go({ e: null });
  const toPage = (key: 'page' | 'gp', value: number) => go({ [key]: value > 1 ? String(value) : null });

  // Loading follows the URL: a different collection or round starts from the skeleton, a different page does not.
  let groupsFor: string | null = null;
  $effect(() => {
    const collectionId = openId;
    const wanted = groupPage;
    const size = groupLimit;
    // Back from a round reloads the rounds, since its entries may have been reviewed meanwhile.
    if (!collectionId || openTag !== null) return void (groupsFor = collectionId ? groupsFor : null);
    untrack(() => {
      if (groupsFor !== collectionId) groupsLoaded = false;
      groupsFor = collectionId;
      void loadGroups(collectionId, wanted, size);
    });
  });

  let rowsFor: string | null = null;
  $effect(() => {
    const collectionId = openId;
    const tag = openTag;
    const status = urlStatus;
    const wanted = page;
    const size = limit;
    statusFilter = status;
    if (!collectionId || tag === null) return void (rowsFor = null);
    untrack(() => {
      const key = `${collectionId}|${tag}`;
      if (rowsFor !== key) rowsLoaded = false;
      rowsFor = key;
      void loadRows(collectionId, tag, status, wanted, size);
    });
  });

  async function loadGroups(collectionId: string, wanted: number, size: number) {
    loading = true;
    try {
      const res = await api.fileSubmissions.groups(guildId, { page: wanted, limit: size, collectionId });
      groups = res.groups;
      groupTotal = res.pagination.total;
      remember(`groups:${collectionId}`, res.groups.length);
      groupsLoaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  async function loadRows(collectionId: string, tag: string, status: string, wanted: number, size: number) {
    loading = true;
    try {
      const res = await api.fileSubmissions.submissions(guildId, { page: wanted, limit: size, status, collectionId, tag });
      rows = res.submissions;
      total = res.pagination.total;
      remember(`rows:${collectionId}|${tag}|${status}`, res.submissions.length);
      rowsLoaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  const replaceRow = (updated: FileSubmissionRow) => (rows = rows.map(r => (r.id === updated.id ? updated : r)));

  async function approve(row: FileSubmissionRow) {
    if (working) return;
    working = true;
    try {
      replaceRow(await api.fileSubmissions.approve(guildId, row.id));
      toast('success', 'Entry approved');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      working = false;
    }
  }

  async function reject() {
    if (!rejecting || working) return;
    working = true;
    try {
      replaceRow(await api.fileSubmissions.reject(guildId, rejecting.id, reason));
      toast('success', 'Entry rejected');
      rejecting = null;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      working = false;
    }
  }

  async function saveUpvotes(row: FileSubmissionRow) {
    if (working) return;
    working = true;
    try {
      replaceRow(await api.fileSubmissions.upvotes(guildId, row.id, Number(upvotes)));
      toast('success', 'Upvotes saved');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      working = false;
    }
  }

  const entryActions = (row: FileSubmissionRow): RowMenuItem[] => [
    { label: 'Preview', icon: Eye, onclick: () => showPreview(row) },
    { label: 'Approve', icon: Check, disabled: working || row.status === 'approved', onclick: () => approve(row) },
    { label: 'Reject', icon: X, danger: true, disabled: working, onclick: () => startReject(row) },
  ];
  const startReject = (row: FileSubmissionRow) => {
    reason = '';
    rejecting = row;
  };
  // The preview closes first, and with it `previewRow`, so the row is taken before that.
  const rejectFromPreview = (row: FileSubmissionRow) => {
    closePreview();
    startReject(row);
  };
  const showPreview = (row: FileSubmissionRow) => {
    upvotes = row.upvotes === null ? '' : String(row.upvotes);
    go({ e: row.id });
  };

  onMount(async () => {
    const [collections, roleList] = await Promise.allSettled([api.fileSubmissions.collections(guildId), api.roles(guildId)]);
    if (roleList.status === 'fulfilled') roles = roleList.value;
    if (collections.status === 'fulfilled') {
      data = collections.value;
      remember('collections', collections.value.collections.length);
      remember('collections', collections.value.collections.length);
    }
    else toast('error', collections.reason?.message ?? 'Could not load the collections');
  });
</script>

{#snippet hint()}
          <p class="mb-5 text-xs text-zinc-500">
            Staff post a panel with <span class="font-mono {toneText.amber}">/{commandName || 'command'} panel</span>, naming the round (tag) and the box where entries are reviewed.
          </p>
{/snippet}

{#snippet form()}
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <span class={label}>Name</span>
              <Input bind:value={name} maxlength={50} placeholder="Weekly Contest" aria-label="Name" />
            </div>
            <div>
              <span class={label}>Command</span>
              <Input
                bind:value={commandName}
                maxlength={32}
                placeholder="weekly-contest"
                oninput={restrictTo(onlyCommandName, v => ((commandName = v), (commandTouched = true)))}
                aria-label="Command name"
              />
              <p class="mt-1.5 text-xs text-zinc-500">Typed as <span class="font-mono {toneText.amber}">/{commandName || 'command'}</span>. Lowercase, no spaces.</p>
            </div>
            <div class="sm:col-span-2">
              <span class={label}>Description</span>
              <Input bind:value={description} maxlength={100} placeholder="Shown in Discord next to the command (optional)" aria-label="Description" />
            </div>
            <div class="sm:col-span-2">
              <span class={label}>Accepted files</span>
              <ChipPicker items={KIND_ITEMS} selected={kinds} onchange={next => (kinds = next)} placeholder="Add a kind..." label="Accepted files" />
            </div>
            <div>
              <span class={label}>Files per upload</span>
              <Input bind:value={maxFiles} inputmode="numeric" maxlength={2} oninput={restrictTo(onlyDigits, v => (maxFiles = v))} aria-label="Files per upload" />
              <p class="mt-1.5 text-xs text-zinc-500">1 to 10.</p>
            </div>
            <div>
              <span class={label}>Entries per member</span>
              <Input bind:value={maxEntries} inputmode="numeric" maxlength={3} placeholder="Unlimited" oninput={restrictTo(onlyDigits, v => (maxEntries = v))} aria-label="Entries per member" />
              <p class="mt-1.5 text-xs text-zinc-500">Counted per round. Empty is unlimited.</p>
            </div>
            <div>
              <span class={label}>Approval role</span>
              <RoleSelect {roles} manageable bind:value={approveRole} none="No role" label="Approval role" class="w-full" />
              <p class="mt-1.5 text-xs text-zinc-500">Given to the member when an entry is approved.</p>
            </div>
            <div>
              <span class={label}>Rejection role</span>
              <RoleSelect {roles} manageable bind:value={rejectRole} none="No role" label="Rejection role" class="w-full" />
              <p class="mt-1.5 text-xs text-zinc-500">Given to the member when an entry is rejected.</p>
            </div>
            <div>
              <span class={label}>Publish reaction</span>
              <Input bind:value={reaction} maxlength={64} placeholder="An emoji, empty for none" aria-label="Publish reaction" />
              <p class="mt-1.5 text-xs text-zinc-500">Added to each message of <span class="font-mono">publish</span>.</p>
            </div>
            <div class="space-y-3 pt-6">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-zinc-300">All files of an upload are one entry</span>
                <Toggle on={grouped} label="All files of an upload are one entry" onclick={() => (grouped = !grouped)} />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-zinc-300">A rejected entry still counts</span>
                <Toggle on={countRejected} label="A rejected entry still counts" onclick={() => (countRejected = !countRejected)} />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-zinc-300">Rejecting needs a reason</span>
                <Toggle on={requireReason} label="Rejecting needs a reason" onclick={() => (requireReason = !requireReason)} />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-zinc-300">Show the reason to the submitter</span>
                <Toggle on={showReason} label="Show the reason to the submitter" onclick={() => (showReason = !showReason)} />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-zinc-300">Staff can set upvotes</span>
                <Toggle on={allowUpvotes} label="Staff can set upvotes" onclick={() => (allowUpvotes = !allowUpvotes)} />
              </div>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onclick={() => (panel = false)}>Cancel</Button>
            <SaveButton onclick={save} disabled={!name.trim() || !commandName || !kinds.length} {saving} />
          </div>
{/snippet}

<PageHeader module="file-submissions" description="Collect files from members, review them and publish the approved ones" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <nav class="flex items-center gap-1.5 text-sm" aria-label="Where you are">
      <button type="button" class="cursor-pointer font-semibold {openId ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-100'}" onclick={closeCollection}>Collections</button>
      {#if openId}
        <ChevronRight class="w-3.5 h-3.5 text-zinc-600" />
        <button type="button" class="cursor-pointer font-semibold {openTag !== null ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-100'}" onclick={closeRound}>
          {#if opened}{opened.name}{:else}<span class="inline-block h-4 w-28 rounded bg-zinc-700/40 animate-pulse align-middle" aria-hidden="true"></span>{/if}
        </button>
      {/if}
      {#if openId && openTag !== null}
        <ChevronRight class="w-3.5 h-3.5 text-zinc-600" />
        <span class="font-semibold text-zinc-100">{openTag}</span>
      {/if}
    </nav>
    {#if !openId}
      <div class="flex items-center gap-3">
        {#if isAdmin}
          {#if data}
            <span class="text-xs text-zinc-500">{data.collections.length} of {data.max_collections} collections</span>
            <Button variant="primary" disabled={full && !panel} onclick={() => (panel && !editing ? (panel = false) : openPanel(null))}><Plus class="w-3.5 h-3.5" />Add collection</Button>
          {:else}
            <ControlSkeleton class="w-36" h="h-8" />
            <ControlSkeleton class="w-36" h="h-8" />
          {/if}
        {/if}
      </div>
    {:else}
      <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
    {/if}
  </div>

  {#if data}<WarningBanner warnings={data.warnings} />{/if}

  {#if openId && openTag === null}
    <!-- The rounds of a collection: how a round, and the entries in it, come to be. What happens to an entry is on the entries level. -->
    <InfoPanel
      show={info}
      title="How rounds work"
      tone="amber"
      steps={[
        { text: 'A round starts when staff post a Submit panel with this collection\'s command: a message with buttons that remembers the round name (tag) and the box, the channel or thread where entries go for review. Each tag shows up here as a round.', command: `/${opened?.command_name ?? 'command'} panel tag:<round> box:<channel or thread>` },
        { text: 'A member presses Submit and attaches files. They are checked against the collection\'s rules: file kinds, how many in one upload, and how many entries that person already has in the round.' },
        { text: 'Each valid entry is posted in the box as its own message (one per file, or one per upload, as the collection says) and counted in the round. Staff can submit for someone else.' },
      ]}
    />
  {:else if openId && openTag !== null}
    <!-- The entries of a round: what happens to an entry once it is in the box. -->
    <InfoPanel
      show={info}
      title="How entries are handled"
      tone="amber"
      steps={[
        { text: 'A new entry waits as pending. Its message in the box has Approve and Reject buttons (and Set Upvotes when the collection uses them).' },
        { text: 'A reviewer approves or rejects, with a reason when the collection asks for one. The message in the box is updated and the approval or rejection role is given, if the collection has one. The same review can be done here: preview an entry, then use its menu.' },
        { text: 'The member sees the outcome under Check Status: their counts, and the approved or rejected files (with the reason, when the collection shows it).' },
        { text: 'Publishing posts the approved entries of this round in a channel, with the collection\'s reaction. The files are read from the box messages again, since Discord links expire, and kept for a month so this page stays fast.', command: `/${opened?.command_name ?? 'command'} publish tag:<round>` },
      ]}
    />
  {/if}

  {#if openId && openTag !== null}
    <!-- The entries of one round -->
    <div class="flex items-center gap-2 flex-wrap">
      <Select
        bind:value={statusFilter}
        options={[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]}
        placeholder="All statuses"
        label="Status"
        onchange={() => go({ status: statusFilter || null, page: null })}
        class="w-44"
      />
    </div>

    {#if rowsLoaded && total === 0}
      <EmptyState kind="search" title="No entries" description="Nothing matches here yet." />
    {:else}
      <Card flush>
        {#if !rowsLoaded}
          <TableSkeleton
            columns={['w-16', 'w-44', 'w-48', 'w-64', 'w-32', 'flex-1', 'w-16']}
            headings={['#', 'Preview', 'Submitted', 'Member', 'Status', 'Note', '']}
            kinds={['bar', 'thumb', 'bar', 'actor', 'pill', 'bar', 'action']}
            rows={entryRows}
            rowHeight="h-20"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class="{th} w-44">Preview</th>
                <th class="{th} w-48">Submitted</th>
                <th class="{th} w-64">Member</th>
                <th class="{th} w-32">Status</th>
                <th class={th}>Note</th>
                <th class="{th} w-16"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each rows as row, i (row.id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{(page - 1) * limit + i + 1}</td>
                  <td class={cell}>
                    <div class="flex items-center gap-1.5">
                      {#each row.files.slice(0, 3) as file (file.url)}
                        <button
                          type="button"
                          title={file.name}
                          onclick={() => showPreview(row)}
                          class="block w-14 h-14 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-700 hover:ring-zinc-500"
                        >
                          {#if isImage(file.type)}
                            <img src={file.url} alt={file.name} loading="lazy" class="w-full h-full object-cover" />
                          {:else}
                            <span class="flex h-full items-center justify-center px-1 text-[10px] text-zinc-400 break-all text-center">{file.name.split('.').pop()}</span>
                          {/if}
                        </button>
                      {:else}
                        <span class="text-zinc-500">Gone</span>
                      {/each}
                      {#if row.files.length > 3}<span class="text-xs text-zinc-500">+{row.files.length - 3}</span>{/if}
                    </div>
                  </td>
                  <td class="{cell} text-zinc-500 whitespace-nowrap">{when(row.created_at)}</td>
                  <td class={cell}>
                    {#if row.user}<ActorCell actor={row.user} />{/if}
                    {#if row.submitted_by}<p class="mt-0.5 text-xs text-zinc-500">sent by {row.submitted_by.name ?? row.submitted_by.id}</p>{/if}
                  </td>
                  <td class={cell}><Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge></td>
                  <td class="{cell} text-zinc-400">
                    {#if row.reason}<p class="line-clamp-2 text-xs leading-relaxed" title={row.reason}>{row.reason}</p>{/if}
                    {#if row.upvotes !== null}<p class="text-xs text-zinc-500">{row.upvotes} upvotes</p>{/if}
                    {#if !row.reason && row.upvotes === null}<span class="text-zinc-600">-</span>{/if}
                  </td>
                  <td class="{cell} text-right"><RowMenu label="Actions for this entry" items={entryActions(row)} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <Pagination {page} {limit} {total} onPage={p => toPage('page', p)} onLimit={l => ((limit = l), toPage('page', 1))} disabled={loading} />
        {/if}
      </Card>
    {/if}
  {:else if openId}
    <!-- The rounds of one collection -->
    {#if groupsLoaded && groupTotal === 0}
      <EmptyState kind="search" title="No rounds yet" description={`Post a panel with /${opened?.command_name ?? 'command'} panel and entries will be grouped by its tag.`} />
    {:else}
      <Card flush>
        {#if !groupsLoaded}
          <TableSkeleton
            columns={['w-16', 'flex-1', 'w-28', 'w-28', 'w-28', 'w-28', 'w-48']}
            headings={['#', 'Round', 'Entries', 'Pending', 'Approved', 'Rejected', 'Last entry']}
            rows={groupRows}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Round</th>
                <th class="{th} w-28">Entries</th>
                <th class="{th} w-28">Pending</th>
                <th class="{th} w-28">Approved</th>
                <th class="{th} w-28">Rejected</th>
                <th class="{th} w-48">Last entry</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each groups as group, i (group.tag)}
                <tr
                  class="cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  role="button"
                  tabindex="0"
                  onclick={() => openRound(group.tag)}
                  onkeydown={e => (e.key === 'Enter' || e.key === ' ') && openRound(group.tag)}
                >
                  <td class="{rowCell} text-zinc-500">{(groupPage - 1) * groupLimit + i + 1}</td>
                  <td class="{rowCell} text-zinc-200">{group.tag}</td>
                  <td class="{rowCell} text-zinc-300">{group.total}</td>
                  <td class="{rowCell} text-amber-400">{group.pending}</td>
                  <td class="{rowCell} text-emerald-400">{group.approved}</td>
                  <td class="{rowCell} text-red-400">{group.rejected}</td>
                  <td class="{rowCell} text-zinc-500 whitespace-nowrap">{when(group.last_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <Pagination
            page={groupPage}
            limit={groupLimit}
            total={groupTotal}
            onPage={p => toPage('gp', p)}
            onLimit={l => ((groupLimit = l), toPage('gp', 1))}
            disabled={loading}
          />
        {/if}
      </Card>
    {/if}
  {:else}
    <!-- The collections: a few, so long panels -->
    {#if isAdmin && panel && !editing}
      <div transition:slide={{ duration: 220, easing: cubicOut }}>
        <Card>
          <SectionTitle icon={Plus} title="Add a collection" class="mb-1" />
          {@render hint()}
          {@render form()}
        </Card>
      </div>
    {/if}

    {#if !data}
      <div class="space-y-3" aria-hidden="true">
        {#each Array(collectionRows) as _, n (n)}
          <Card>
            <div class="flex items-center gap-4">
              <div class="grid min-w-0 flex-1 items-center gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
                <div class="space-y-2">
                  <div class="h-3.5 w-32 rounded bg-zinc-800/40 animate-pulse"></div>
                  <div class="h-3 w-24 rounded bg-zinc-800/30 animate-pulse"></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  {#each [0, 1] as c (c)}
                    <div class="space-y-1.5">
                      <div class="h-2.5 w-14 rounded bg-zinc-700/40 animate-pulse"></div>
                      <div class="h-3 w-16 rounded bg-zinc-800/40 animate-pulse"></div>
                    </div>
                  {/each}
                </div>
                <div class="grid grid-cols-2 gap-4">
                  {#each [0, 1] as c (c)}
                    <div class="space-y-1.5">
                      <div class="h-2.5 w-14 rounded bg-zinc-700/40 animate-pulse"></div>
                      <div class="h-5 w-20 rounded-md bg-zinc-800/40 animate-pulse"></div>
                    </div>
                  {/each}
                </div>
              </div>
              <div class="h-7 w-16 shrink-0 rounded-lg bg-zinc-800/30 animate-pulse"></div>
            </div>
          </Card>
        {/each}
      </div>
    {:else if data.collections.length === 0}
      <EmptyState kind="modules" title="No collections yet" description="Add a collection, then switch its command on from the Slash page." />
    {:else}
      <div class="space-y-3">
        {#each data.collections as collection (collection.id)}
          <Card>
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="grid min-w-0 flex-1 cursor-pointer items-center gap-x-6 gap-y-3 text-left lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1fr)]"
                onclick={() => openCollection(collection)}
                aria-label="Open {collection.name}"
              >
                <div class="min-w-0" title="/{collection.command_name}">
                  <p class="truncate text-sm font-semibold text-zinc-100">{collection.name}</p>
                  <p class="mt-1 truncate text-xs text-zinc-400">Accepted: {collection.file_types.map(kindName).join(', ')}</p>
                  {#if collection.description}<p class="mt-1 truncate text-xs text-zinc-500">{collection.description}</p>{/if}
                </div>
                <dl class="grid grid-cols-2 gap-4 text-xs">
                  <div class="min-w-0">
                    <dt class="{caps} text-zinc-500">Per upload</dt>
                    <dd class="mt-1 truncate text-zinc-300">{collection.max_files}{collection.entry_style === 'grouped' ? ', one entry' : ''}</dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="{caps} text-zinc-500">Per member</dt>
                    <dd class="mt-1 flex items-center truncate text-zinc-300" title={collection.max_entries ? undefined : 'Unlimited entries per member'}>
                      {#if collection.max_entries}{collection.max_entries}{:else}<InfinityIcon class="h-4 w-4 shrink-0" aria-label="Unlimited" />{/if}
                    </dd>
                  </div>
                </dl>
                <dl class="grid grid-cols-2 gap-4 text-xs">
                  {#each [{ title: 'On approval', id: collection.approve_role_id }, { title: 'On rejection', id: collection.reject_role_id }] as slot (slot.title)}
                    {@const role = roleOf(slot.id)}
                    <div class="min-w-0">
                      <dt class="{caps} text-zinc-500">{slot.title}</dt>
                      <dd class="mt-1">
                        {#if !slot.id}
                          <span class="text-zinc-500">None</span>
                        {:else}
                          <RoleChip {role} />
                        {/if}
                      </dd>
                    </div>
                  {/each}
                  {#each collection.problems as problem}<p class="col-span-2 truncate text-amber-400" title={problem}>{problem}</p>{/each}
                </dl>
              </button>
              <div class="flex shrink-0 items-center gap-1">
                {#if isAdmin}
                  <Button variant="ghost" size="icon" aria-label="Edit {collection.name}" title="Edit" onclick={() => (panel && editing?.id === collection.id ? (panel = false) : openPanel(collection))}><Pencil class="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Remove {collection.name}" title="Remove" onclick={() => (removeTarget = collection)}>
                    <Trash2 class="w-3.5 h-3.5 text-red-400" />
                  </Button>
                {/if}
                <ChevronRight class="w-4 h-4 text-zinc-600" />
              </div>
            </div>
            {#if isAdmin && panel && editing?.id === collection.id}
              <div class="mt-5 border-t border-zinc-800/60 pt-5" transition:slide={{ duration: 220, easing: cubicOut }}>
                <SectionTitle icon={Pencil} title="Edit {collection.name}" class="mb-1" />
                {@render hint()}
                {@render form()}
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<Modal show={!!previewRow} wide onClose={closePreview}>
  {#if previewRow}
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="{caps} text-zinc-500 truncate">{previewRow.collection_name}</p>
        <h3 class="mt-0.5 font-display text-lg font-bold text-zinc-100 truncate">{previewRow.tag}</h3>
      </div>
      <Badge tone={STATUS_TONE[previewRow.status]}>{previewRow.status}</Badge>
    </div>

    <div class="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem]">
      <div class="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl bg-zinc-950/60 p-2 ring-1 ring-zinc-800">
        {#each previewRow.files as file (file.url)}
          {#if isImage(file.type)}
            <a href={file.url} target="_blank" rel="noreferrer" title="Open the original"><img src={file.url} alt={file.name} class="mx-auto max-h-[56vh] w-auto rounded-lg object-contain" /></a>
          {:else if isVideo(file.type)}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video src={file.url} controls class="mx-auto max-h-[56vh] rounded-lg"></video>
          {:else if isAudio(file.type)}
            <audio src={file.url} controls class="w-full"></audio>
          {:else}
            <a href={file.url} target="_blank" rel="noreferrer" class="block truncate rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100">{file.name}</a>
          {/if}
        {:else}
          <p class="px-3 py-10 text-center text-xs text-zinc-500">The message with the files is gone from the box.</p>
        {/each}
      </div>

      <div class="space-y-4 text-xs">
        <div class="divide-y divide-zinc-800/60 rounded-lg bg-zinc-800/40 px-3">
          <div class="flex items-center justify-between gap-3 py-2">
            <span class="text-zinc-500">Submitted</span>
            <span class="text-zinc-200">{short(previewRow.created_at)}</span>
          </div>
          {#if previewRow.status !== 'pending' && previewRow.reviewed_at}
            <div class="flex items-center justify-between gap-3 py-2">
              <span class="text-zinc-500">{previewRow.status === 'approved' ? 'Approved' : 'Rejected'}</span>
              <span class="text-zinc-200">{short(previewRow.reviewed_at)}</span>
            </div>
          {/if}
        </div>

        <div>
          <p class="{caps} mb-1.5 text-zinc-500">Submitted by</p>
          {#if previewRow.user}<ActorCell actor={previewRow.user} />{/if}
          {#if previewRow.submitted_by}<p class="mt-1 text-zinc-500">sent by {previewRow.submitted_by.name ?? previewRow.submitted_by.id}</p>{/if}
        </div>

        {#if previewRow.status !== 'pending'}
          <div>
            <p class="{caps} mb-1.5 text-zinc-500">{previewRow.status === 'approved' ? 'Approved by' : 'Rejected by'}</p>
            {#if previewRow.reviewer}<ActorCell actor={previewRow.reviewer} />{:else}<p class="text-zinc-500">A moderator</p>{/if}
          </div>
          {#if previewRow.reason}
            <div>
              <p class="{caps} mb-1.5 text-zinc-500">Reason</p>
              <p class="rounded-lg bg-zinc-800/60 px-2.5 py-2 leading-relaxed text-zinc-300">{previewRow.reason}</p>
            </div>
          {/if}
        {/if}

        {#if previewRow.status === 'approved' && opened?.allow_upvotes}
          <div>
            <p class="{caps} mb-1.5 text-zinc-500">Upvotes</p>
            <div class="flex items-center gap-2">
              <Input bind:value={upvotes} inputmode="numeric" maxlength={7} placeholder="0" oninput={restrictTo(onlyDigits, v => (upvotes = v))} aria-label="Upvotes" class="w-full" />
              <Button variant="soft" disabled={working || !upvotes} onclick={() => saveUpvotes(previewRow)}>Save</Button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="mt-5 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-4">
      <Button variant="ghost" onclick={closePreview}>Close</Button>
      <div class="flex gap-2">
        <Button variant="danger" disabled={working} onclick={() => rejectFromPreview(previewRow)}>Reject</Button>
        <Button variant="success" disabled={working || previewRow.status === 'approved'} onclick={() => approve(previewRow)}>Approve</Button>
      </div>
    </div>
  {/if}
</Modal>

<Modal show={!!rejecting} onClose={() => !working && (rejecting = null)}>
  {#if rejecting}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <X class="w-4 h-4 shrink-0 text-red-400" />Reject this entry?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">The reason is shown on the entry in Discord and to the member in Check Status.</p>
    <div class="mt-3">
      <span class={label}>Reason{rejectNeedsReason ? '' : ' (optional)'}</span>
      <Textarea bind:value={reason} maxlength={300} rows={3} aria-label="Reason" />
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={() => (rejecting = null)} disabled={working}>Cancel</Button>
      <Button variant="danger" onclick={reject} disabled={working || (rejectNeedsReason && !reason.trim())}>{working ? 'Rejecting…' : 'Reject'}</Button>
    </div>
  {/if}
</Modal>

<Modal show={!!removeTarget} onClose={() => !removing && (removeTarget = null)}>
  {#if removeTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Trash2 class="w-4 h-4 shrink-0 text-red-400" />Remove {removeTarget.name}?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">
      Its panels and the record of its entries are deleted, and /{removeTarget.command_name} stops working. The messages already in the box stay in Discord.
    </p>
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={() => (removeTarget = null)} disabled={removing}>Cancel</Button>
      <Button variant="danger" onclick={remove} disabled={removing}>{removing ? 'Removing…' : 'Remove'}</Button>
    </div>
  {/if}
</Modal>
