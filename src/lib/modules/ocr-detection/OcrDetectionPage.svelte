<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import InfoPanel, { type InfoStep } from '$lib/components/InfoPanel.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import ChannelsPicker from '$lib/components/ChannelsPicker.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Select from '$lib/components/Select.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WarningBanner from '$lib/components/WarningBanner.svelte';
  import ActorCell from '$lib/components/ActorCell.svelte';
  import { api, type DiscordChannel, type OcrDetectionConfig, type OcrDetectionItem, type OcrTerms } from '$lib/api/endpoints';
  import { onlyDecimal, restrictTo } from '$lib/number-input';
  import { formatTerms, parseTerms, termsProblem } from './blocklist-text';
  import { toast } from '$lib/stores/toast.svelte';
  import { label, td, th } from '$lib/ui';
  import { Info, ListX, RotateCcw, ScanText, Settings } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let info = $state(false);
  // The hint follows the tab: each one explains what is in front of the person, not the whole module.
  const HINTS: Record<string, { title: string; steps: InfoStep[] }> = {
    detections: {
      title: 'How an image is checked',
      steps: [
        { text: 'An image posted in the watched channel goes on the watchlist as a pending detection. Each row here is one image.' },
        { text: 'A background reader takes the pending images one at a time, shrinks each and sends it to a text recognition service (OCR.space), which returns the text it sees. If the service says it is busy, reading pauses for an hour and the images wait.' },
        { text: 'The text is compared with the blocklist. No match: the image is marked safe and its stored link is dropped. A match is flagged and reported in the report channel, where a moderator can delete the message, ignore it or time the author out.' },
        { text: 'An image that cannot be read is tried again later, a little longer each time, and fails with its reason if it never works. A message can also be read by hand with the Scan Text command.' },
      ],
    },
    terms: {
      title: 'How the blocklist is used',
      steps: [
        { text: 'The text read from an image is split into lines, and each line is compared with every term in this list.' },
        { text: 'A line matches when it is close enough to a term. Small differences still count, so a misspelled or partly unreadable word is caught. How close is the similarity set in the Settings tab.' },
        { text: 'One matching term is enough to flag the image. The list belongs to this server only; Restore defaults adds back the default terms that were removed, without touching the ones you added.' },
      ],
    },
    settings: {
      title: 'How these settings apply',
      steps: [
        { text: 'The watched channel decides which images are read: only the ones posted there from now on. Images posted before it was set, or elsewhere, are never read.' },
        { text: 'The report channel is where a flagged image is posted, with the buttons to delete the message, ignore it or time the author out.' },
        { text: 'The similarity decides how close a line of text must be to a term to count as a match: lower catches more, but flags more harmless images too.' },
      ],
    },
  };
  let tab = $state('detections');
  const hint = $derived(HINTS[tab] ?? HINTS.detections);
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
  // The blocklist as a text box, one term per line, until Save.
  let termsText = $state('');
  let savedText = $state('');
  let savingTerms = $state(false);
  let restoring = $state(false);

  const cell = td.replace('h-11', 'h-14');
  const when = (ts: string) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const where = (id: string) => channels.find(c => c.id === id)?.name ?? id;

  const MAX_TERMS = 1000;
  const termsDirty = $derived(termsText.trim() !== savedText.trim());
  const termsError = $derived(termsProblem(termsText, MAX_TERMS));
  const termCount = $derived(parseTerms(termsText).length);

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

  function showTerms(next: OcrTerms) {
    terms = next;
    savedText = formatTerms(next.terms);
    termsText = savedText;
  }

  async function saveTerms() {
    if (termsError) return;
    savingTerms = true;
    try {
      showTerms(await api.ocrDetection.saveTerms(guildId, parseTerms(termsText)));
      toast('success', 'Blocklist saved', 'The next image that is read uses it.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingTerms = false;
    }
  }

  async function restoreDefaults() {
    restoring = true;
    try {
      const res = await api.ocrDetection.restoreDefaults(guildId);
      showTerms(res);
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
    if (termList.status === 'fulfilled') showTerms(termList.value);
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
        { id: 'terms', label: 'Blocklist', icon: ListX, count: terms ? parseTerms(savedText).length : null },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]}
    />
    <Button variant="secondary" onclick={() => (info = !info)} aria-expanded={info}><Info class="w-3.5 h-3.5" />Info</Button>
  </div>

  <InfoPanel show={info} title={hint.title} tone="blue" steps={hint.steps} />

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
    <Card>
      <SectionTitle icon={ListX} title="Blocklist" class="mb-1" />
      <p class="mb-4 text-xs leading-relaxed text-zinc-500">
        One term per line. A word matches when it contains the term or is similar enough (see Similarity). A line between slashes, like <span class="font-mono text-zinc-300">/\bass\b/</span>, is a regular expression tested as written.
      </p>
      {#if !terms}
        <div class="h-80 w-full rounded-lg bg-zinc-800/40 animate-pulse" aria-hidden="true"></div>
      {:else}
        <Textarea bind:value={termsText} rows={16} mono disabled={!isAdmin} placeholder="One term per line" aria-label="Blocklist terms" />
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs {termsError ? 'text-red-400' : 'text-zinc-500'}">
            {termsError ?? `${termCount} term${termCount === 1 ? '' : 's'}${termsDirty ? ', not saved yet' : ''}`}
          </p>
          {#if isAdmin}
            <div class="flex items-center gap-2">
              <Button variant="ghost" onclick={() => (termsText = savedText)} disabled={!termsDirty || savingTerms}>Discard</Button>
              <Button variant="secondary" onclick={restoreDefaults} disabled={termsDirty || restoring} title={termsDirty ? 'Save or discard your changes first' : 'Add back the default terms that were removed'}>
                <RotateCcw class="w-3.5 h-3.5" />Restore defaults
              </Button>
              <Button variant="primary" onclick={saveTerms} disabled={!termsDirty || !!termsError || savingTerms}>{savingTerms ? 'Saving…' : 'Save'}</Button>
            </div>
          {/if}
        </div>
      {/if}
    </Card>
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
        <TableSkeleton
            columns={['w-16', 'w-64', 'flex-1', 'w-56', 'w-36', 'w-44']}
            headings={['#', 'User', 'Image', 'Matched', 'Status', 'Detected']}
            kinds={['bar', 'actor', 'bar', 'bar', 'pill', 'bar']}
            rows={5}
            rowHeight="h-14"
          />
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
