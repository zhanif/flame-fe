<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import ChannelsPicker from '$lib/components/ChannelsPicker.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import ActorCell from '$lib/components/ActorCell.svelte';
  import { api, type DiscordChannel, type OcrDetectionConfig, type OcrDetectionItem, type OcrTerms } from '$lib/api/endpoints';
  import { onlyDecimal, restrictTo } from '$lib/number-input';
  import { toast } from '$lib/stores/toast.svelte';
  import { label, td, th } from '$lib/ui';
  import { ListX, Plus, RotateCcw, ScanText, Search, Settings, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let tab = $state('detections');
  let config: OcrDetectionConfig | null = $state(null);
  let channels: DiscordChannel[] = $state([]);

  // The settings form: what is typed, until Save.
  let enabled = $state(false);
  let reportChannel = $state('');
  let targets: string[] = $state([]);
  let threshold = $state('0.78');
  let saving = $state(false);

  let items: OcrDetectionItem[] = $state([]);
  let pending = $state(0);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);
  let statusFilter = $state('');

  let terms: OcrTerms | null = $state(null);
  let adding = $state(false);
  let newTerm = $state('');
  let newTermRegex = $state(false);
  let addingBusy = $state(false);
  let termQuery = $state('');
  let termPage = $state(1);
  let termLimit = $state(20);
  let restoring = $state(false);

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const where = (id: string) => channels.find(c => c.id === id)?.name ?? id;

  // The blocklist is filtered and paged here: it is a few hundred short rows.
  const shownTerms = $derived.by(() => {
    const q = termQuery.trim().toLowerCase();
    const all = terms?.terms ?? [];
    return q ? all.filter(t => t.term.toLowerCase().includes(q)) : all;
  });
  const pageTerms = $derived(shownTerms.slice((termPage - 1) * termLimit, termPage * termLimit));

  const thresholdNumber = $derived(threshold.trim() === '' ? NaN : Number(threshold));
  const thresholdError = $derived.by(() => {
    const current: OcrDetectionConfig | null = config;
    if (!current) return null;
    if (Number.isNaN(thresholdNumber)) return 'Enter a number';
    if (thresholdNumber < current.limits.min_threshold || thresholdNumber > current.limits.max_threshold) {
      return `Between ${current.limits.min_threshold} and ${current.limits.max_threshold}`;
    }
    return null;
  });
  const dirty = $derived.by(() => {
    const current: OcrDetectionConfig | null = config;
    return (
      !!current &&
      (enabled !== current.enabled ||
        reportChannel !== (current.report_channel_id ?? '') ||
        targets.join(',') !== current.target_ids.join(',') ||
        thresholdNumber !== current.threshold)
    );
  });

  function apply(next: OcrDetectionConfig) {
    config = next;
    enabled = next.enabled;
    reportChannel = next.report_channel_id ?? '';
    targets = [...next.target_ids];
    threshold = String(next.threshold);
  }

  async function save() {
    if (!config || thresholdError) return;
    saving = true;
    try {
      apply(
        await api.ocrDetection.updateConfig(guildId, {
          enabled,
          report_channel_id: reportChannel || null,
          threshold: thresholdNumber,
          target_ids: targets,
        }),
      );
      toast('success', 'Settings saved');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  async function loadDetections() {
    loading = true;
    try {
      const res = await api.ocrDetection.detections(guildId, { page, limit, status: statusFilter });
      items = res.items;
      pending = res.pending;
      total = res.pagination.total;
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  async function changeTerms(action: () => Promise<OcrTerms>, success: string): Promise<boolean> {
    try {
      terms = await action();
      toast('success', success);
      return true;
    } catch (e: any) {
      toast('error', e.message);
      return false;
    }
  }

  async function addTerm() {
    if (!newTerm.trim() || addingBusy) return;
    addingBusy = true;
    if (await changeTerms(() => api.ocrDetection.addTerm(guildId, newTerm, newTermRegex), 'Term added')) {
      newTerm = '';
      newTermRegex = false;
      adding = false;
    }
    addingBusy = false;
  }

  async function restoreDefaults() {
    restoring = true;
    try {
      const res = await api.ocrDetection.restoreDefaults(guildId);
      terms = res;
      toast('success', res.restored ? `Restored ${res.restored} default terms` : 'Nothing to restore', res.restored ? undefined : 'Every default term is already on the list.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      restoring = false;
    }
  }

  const goTo = (p: number) => {
    page = p;
    void loadDetections();
  };
  const refilter = () => {
    page = 1;
    void loadDetections();
  };
  const setLimit = (l: number) => {
    limit = l;
    page = 1;
    void loadDetections();
  };

  onMount(async () => {
    void loadDetections();
    const [loadedConfig, channelList, termList] = await Promise.allSettled([api.ocrDetection.config(guildId), api.channels(guildId), api.ocrDetection.terms(guildId)]);
    if (channelList.status === 'fulfilled') channels = channelList.value;
    if (termList.status === 'fulfilled') terms = termList.value;
    if (loadedConfig.status === 'fulfilled') apply(loadedConfig.value);
    else toast('error', loadedConfig.reason?.message ?? 'Could not load the OCR detection settings');
  });

  const statusLabel = { flagged: 'Needs review', handled: 'Handled', failed: 'Failed', pending: 'Waiting', safe: 'Safe' } as const;
  const statusTone = { flagged: 'warning', handled: 'neutral', failed: 'danger', pending: 'info', safe: 'success' } as const;
  const actionText = { deleted: 'Deleted', ignored: 'Ignored', timeout: 'Timed out' } as const;
</script>

<PageHeader module="ocr-detection" description="Reports images whose text matches a blocklist" />

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <Tabs
      bind:value={tab}
      tabs={[
        { id: 'detections', label: 'Detections', icon: ScanText, count: loaded ? total : null },
        { id: 'terms', label: 'Blocklist', icon: ListX, count: terms ? terms.terms.length : null },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    {#if isAdmin && tab === 'terms'}
      <div class="flex items-center gap-2">
        <Button variant="secondary" onclick={restoreDefaults} disabled={restoring} title="Add back the default terms that were removed"><RotateCcw class="w-3.5 h-3.5" />Restore defaults</Button>
        <Button variant="primary" onclick={() => (adding = !adding)}><Plus class="w-3.5 h-3.5" />Add term</Button>
      </div>
    {/if}
  </div>

  {#if config}<WarningBanner warnings={config.warnings} />{/if}

  {#if tab === 'settings'}
    <Card>
      <SectionTitle icon={ScanText} title="OCR Detection" class="mb-5" />
      {#if !config}
        <div class="space-y-5" aria-hidden="true">
          {#each Array(5) as _}
            <div class="flex items-center justify-between gap-8">
              <div class="space-y-2"><div class="h-3.5 w-32 rounded bg-zinc-700/40 animate-pulse"></div><div class="h-2.5 w-64 rounded bg-zinc-800/40 animate-pulse"></div></div>
              <div class="h-9 w-56 rounded-lg bg-zinc-800/40 animate-pulse"></div>
            </div>
          {/each}
        </div>
      {:else}
        <SettingRow title="Detection" hint="Reads the images posted in the watched channel and reports the ones that match the blocklist.">
          <div class="flex items-center gap-3 sm:justify-end">
            <span class="text-sm text-zinc-300">{enabled ? 'On' : 'Off'}</span>
            <Toggle on={enabled} disabled={!isAdmin} label="OCR Detection on" onclick={() => (enabled = !enabled)} />
          </div>
        </SettingRow>

        <SettingRow title="Provider" hint="Reads the text in images. More providers can be offered later.">
          <div class="flex items-center gap-2 sm:justify-end">
            <span class="text-sm text-zinc-200">{config.provider.label}</span>
            <Badge tone={config.provider.configured ? 'success' : 'danger'}>{config.provider.configured ? 'Ready' : 'No key'}</Badge>
          </div>
        </SettingRow>

        <SettingRow title="Watched channels" hint="Images posted here are read (jpg, png and webp). A forum covers its threads and a category its channels. Up to {config.limits.max_targets} at the moment.">
          <ChannelsPicker {channels} selected={targets} onchange={next => (targets = next)} max={config.limits.max_targets} disabled={!isAdmin} label="Watched channels" />
        </SettingRow>

        <SettingRow title="Report channel" hint="Where a match is reported, with buttons to delete the message, ignore it or time out the user.">
          <ChannelPicker {channels} bind:value={reportChannel} none="No channel" label="Report channel" disabled={!isAdmin} class="w-full" />
        </SettingRow>

        <SettingRow
          title="Similarity"
          hint={thresholdError ?? `A word that is ${Math.round(thresholdNumber * 100)}% like a term counts as a match. Higher is stricter.`}
          error={!!thresholdError}
        >
          <div class="sm:flex sm:justify-end">
            <Input bind:value={threshold} inputmode="decimal" maxlength={5} placeholder="0.78" oninput={restrictTo(onlyDecimal, v => (threshold = v))} aria-label="Similarity" disabled={!isAdmin} class="w-full sm:w-32" />
          </div>
        </SettingRow>

        {#if isAdmin}
          <div class="flex justify-end pt-5">
            <Button variant="primary" onclick={save} disabled={!dirty || !!thresholdError || saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        {/if}
      {/if}
    </Card>
  {:else if tab === 'terms'}
    {#if isAdmin && adding}
      <div transition:slide={{ duration: 220, easing: cubicOut }}>
        <Card>
          <SectionTitle icon={Plus} title="Add a term" class="mb-1" />
          <p class="mb-4 text-xs text-zinc-500">A word matches when it contains the term or is similar enough. A regular expression is tested as written.</p>
          <div class="flex flex-col sm:flex-row sm:items-end gap-3">
            <div class="w-full sm:w-80">
              <span class={label}>Term</span>
              <Input bind:value={newTerm} maxlength={100} placeholder="A word or a regular expression" aria-label="Term" />
            </div>
            <label class="flex items-center gap-2 h-9 text-sm text-zinc-300">
              <Toggle on={newTermRegex} label="Regular expression" onclick={() => (newTermRegex = !newTermRegex)} />Regular expression
            </label>
            <Button variant="primary" onclick={addTerm} disabled={!newTerm.trim() || addingBusy}><Plus class="w-3.5 h-3.5" />Add</Button>
            <Button variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
          </div>
        </Card>
      </div>
    {/if}

    {#if terms && terms.terms.length === 0}
      <EmptyState kind="search" title="The blocklist is empty" description="Nothing is detected until it has terms. Add one, or restore Flame's {terms.default_count} default terms." />
    {:else}
      <div class="relative w-full sm:w-72">
        <Search class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input bind:value={termQuery} oninput={() => (termPage = 1)} placeholder="Search terms..." aria-label="Search terms" class="pl-9" />
      </div>
      <Card flush>
        {#if !terms}
          <TableSkeleton columns={['w-16', 'flex-1', 'w-40', 'w-16']} rows={6} />
        {:else if shownTerms.length === 0}
          <p class="px-5 py-8 text-center text-xs text-zinc-500">No term matches "{termQuery}".</p>
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Term</th>
                <th class="{th} w-40">Type</th>
                {#if isAdmin}<th class="{th} w-16"><span class="sr-only">Actions</span></th>{/if}
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each pageTerms as term, i (term.term)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{td} text-zinc-500">{(termPage - 1) * termLimit + i + 1}</td>
                  <td class="{td} text-zinc-200 font-mono break-all">{term.term}</td>
                  <td class={td}><Badge tone={term.is_regex ? 'accent' : 'neutral'}>{term.is_regex ? 'Regular expression' : 'Word'}</Badge></td>
                  {#if isAdmin}
                    <td class="{td} text-right">
                      <Button variant="ghost" size="icon" aria-label="Remove term" onclick={() => changeTerms(() => api.ocrDetection.removeTerm(guildId, term.term), 'Term removed')}>
                        <Trash2 class="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
          <Pagination page={termPage} limit={termLimit} total={shownTerms.length} onPage={p => (termPage = p)} onLimit={l => ((termLimit = l), (termPage = 1))} />
        {/if}
      </Card>
    {/if}
  {:else if loaded && total === 0 && !statusFilter}
    <EmptyState kind="log" title="No detections yet" description="Images in the watched channel are listed here while they wait to be read, and when they match the blocklist." />
  {:else}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Select
        bind:value={statusFilter}
        onchange={refilter}
        placeholder="All except safe"
        label="Status"
        options={[
          { value: 'pending', label: 'Waiting' },
          { value: 'flagged', label: 'Needs review' },
          { value: 'handled', label: 'Handled' },
          { value: 'failed', label: 'Failed' },
          { value: 'safe', label: 'Safe' },
        ]}
        class="w-48"
      />
      {#if pending > 0}
        <p class="text-xs text-zinc-500">{pending} image{pending === 1 ? ' is' : 's are'} waiting to be read. Images are read one at a time.</p>
      {/if}
    </div>
    <Card flush>
      {#if !loaded}
        <TableSkeleton columns={['w-16', 'w-64', 'flex-1', 'w-56', 'w-36', 'w-44']} rows={5} rowHeight="h-14" />
      {:else if items.length === 0}
        <p class="px-5 py-8 text-center text-xs text-zinc-500">No detection has this status.</p>
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
              <th class="{th} w-16">#</th>
              <th class="{th} w-64">User</th>
              <th class={th}>Image</th>
              <th class="{th} w-56">Matched</th>
              <th class="{th} w-36">Status</th>
              <th class="{th} w-44">Detected</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each items as item, i (item.id)}
              <tr class="hover:bg-zinc-800/30 transition-colors">
                <td class="{cell} text-zinc-500">{(page - 1) * limit + i + 1}</td>
                <td class={cell}>{#if item.author}<ActorCell actor={item.author} />{/if}</td>
                <td class="{cell} text-zinc-200">
                  <p class="truncate">{item.attachment_name}</p>
                  <p class="text-xs text-zinc-500">#{where(item.channel_id)}</p>
                </td>
                <td class={cell}>
                  <div class="flex flex-wrap gap-1">
                    {#each item.matched_terms as term (term)}<Badge tone="danger">{term}</Badge>{/each}
                  </div>
                </td>
                <td class={cell}>
                  <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                  {#if item.status === 'handled' && item.handled_action}
                    <p class="mt-0.5 text-xs text-zinc-500 truncate">{actionText[item.handled_action]}{item.handled_by?.name ? ` by ${item.handled_by.name}` : ''}</p>
                  {:else if item.error}
                    <p class="mt-0.5 text-xs text-zinc-500 truncate" title={item.error}>{item.error}</p>
                  {/if}
                </td>
                <td class="{cell} text-zinc-500 whitespace-nowrap">{when(item.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
      {/if}
    </Card>
  {/if}
</div>
