<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChannelPicker from '$lib/components/ChannelPicker.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type DiscordChannel, type QuoteEntry } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { label, td, th } from '$lib/ui';
  import { Megaphone, Quote, ScrollText, Settings, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId, isAdmin }: { guildId: string; isAdmin: boolean } = $props();

  let tab = $state('quotes');

  let quotes: QuoteEntry[] = $state([]);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let loading = $state(true);
  let loaded = $state(false);

  let logTarget: QuoteEntry | null = $state(null);
  let deleteTarget: QuoteEntry | null = $state(null);
  let deleteReason = $state('');
  let deleting = $state(false);

  let channels: DiscordChannel[] = $state([]);
  let publishChannel = $state('');
  let savedChannel = '';
  let settingsLoaded = $state(false);

  const cell = td.replace('h-11', 'h-14');

  const when = (ts: string) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  async function loadQuotes() {
    loading = true;
    try {
      const res = await api.quotes(guildId, { page, limit });
      quotes = res.quotes;
      total = res.pagination.total;
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  function openDelete(quote: QuoteEntry) {
    deleteTarget = quote;
    deleteReason = '';
  }
  function closeDelete() {
    if (!deleting) deleteTarget = null;
  }

  async function confirmDelete() {
    if (!deleteTarget || !deleteReason.trim()) return;
    deleting = true;
    try {
      const res = await api.deleteQuote(guildId, deleteTarget.id, deleteReason.trim());
      deleteTarget = null;
      toast(
        res.failed ? 'info' : 'success',
        `Quote #${res.number} deleted`,
        res.failed ? `${res.failed} Discord message${res.failed === 1 ? '' : 's'} could not be removed.` : undefined,
      );
      await loadQuotes();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      deleting = false;
    }
  }

  async function saveChannel() {
    try {
      const saved = await api.updateQuoteSettings(guildId, publishChannel || null);
      savedChannel = publishChannel = saved.publish_channel_id ?? '';
      toast('success', savedChannel ? 'Publish channel saved' : 'Publishing stopped', savedChannel ? 'New quotes will be posted there.' : 'Quotes are no longer posted to a channel.');
    } catch (e: any) {
      publishChannel = savedChannel;
      toast('error', e.message);
    }
  }

  onMount(async () => {
    loadQuotes();
    const [settings, list] = await Promise.allSettled([api.quoteSettings(guildId), api.channels(guildId)]);
    if (list.status === 'fulfilled') channels = list.value;
    if (settings.status === 'fulfilled') savedChannel = publishChannel = settings.value.publish_channel_id ?? '';
    settingsLoaded = true;
  });

  function goTo(p: number) {
    page = p;
    loadQuotes();
  }
  function setLimit(l: number) {
    limit = l;
    page = 1;
    loadQuotes();
  }
</script>

<PageHeader module="quotes" description="Memorable messages of this server" />

<div class="space-y-5">
  <Tabs
    bind:value={tab}
    tabs={[
      { id: 'quotes', label: 'Quotes', icon: Quote, count: loaded ? total : null },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]}
  />

  {#if tab === 'settings'}
    <Card>
      <SectionTitle icon={Megaphone} title="Publishing" class="mb-5" />
      <span class={label}>Publish channel</span>
      <p class="mb-2.5 text-xs text-zinc-500">Where new quotes are posted. Pick Not published to stop posting them.</p>
      {#if settingsLoaded}
        <ChannelPicker {channels} bind:value={publishChannel} onchange={saveChannel} none="Not published" label="Publish channel" disabled={!isAdmin} class="w-full sm:w-80" />
      {:else}
        <div class="h-9 w-full sm:w-80 rounded-lg bg-zinc-800/40 animate-pulse" aria-hidden="true"></div>
      {/if}
    </Card>
  {:else if loaded && total === 0}
    <EmptyState kind="quote" title="No quotes yet" description="Right-click a message, choose Apps, then Quote to make the first one." />
  {:else}
    <Card flush>
      {#if !loaded}
        <TableSkeleton
            columns={['w-16', 'flex-1', 'w-64', 'w-64', 'w-36', 'w-36', 'w-16']}
            headings={['#', 'Quote', 'Author', 'Quoted by', 'Quoted', 'Status', '']}
            kinds={['bar', 'bar', 'actor', 'actor', 'bar', 'pill', 'action']}
            rows={5}
            rowHeight="h-14"
          />
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
              <th class="{th} w-16">#</th>
              <th class={th}>Quote</th>
              <th class="{th} w-64">Author</th>
              <th class="{th} w-64">Quoted by</th>
              <th class="{th} w-36">Quoted</th>
              <th class="{th} w-36">Status</th>
              <th class="{th} w-16"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each quotes as quote (quote.id)}
              <tr class="hover:bg-zinc-800/30 transition-colors">
                <td class="{cell} text-zinc-500">{quote.number}</td>
                <td class="{cell} text-zinc-200"><span class="line-clamp-2">{quote.content}</span></td>
                <td class={cell}>{#if quote.author}<ActorCell actor={quote.author} />{/if}</td>
                <td class={cell}>{#if quote.creator}<ActorCell actor={quote.creator} />{/if}</td>
                <td class="{cell} text-zinc-500 whitespace-nowrap">{when(quote.created_at)}</td>
                <td class={cell}>
                  {#if quote.deleted}
                    <Badge tone="danger">Deleted</Badge>
                  {:else}
                    <Badge tone={quote.published ? 'success' : 'neutral'}>{quote.published ? 'Published' : 'Not published'}</Badge>
                  {/if}
                </td>
                <td class="{cell} text-right">
                  {#if quote.deleted}
                    <Button variant="ghost" size="icon" aria-label="Deletion log of quote {quote.number}" onclick={() => (logTarget = quote)}>
                      <ScrollText class="w-3.5 h-3.5" />
                    </Button>
                  {:else}
                    <Button variant="ghost" size="icon" aria-label="Delete quote {quote.number}" onclick={() => openDelete(quote)}>
                      <Trash2 class="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
      {/if}
    </Card>
  {/if}
</div>

<Modal show={!!logTarget} onClose={() => (logTarget = null)}>
  {#if logTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <ScrollText class="w-4 h-4 shrink-0 text-red-400" />Quote #{logTarget.number} deleted
    </h3>
    <span class="{label} mt-4">Reason for deletion</span>
    <p class="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{logTarget.delete_reason ?? 'No reason recorded'}</p>
    <div class="grid grid-cols-2 gap-4 mt-4">
      <div>
        <span class={label}>Deleted by</span>
        {#if logTarget.deleted_by}<ActorCell actor={logTarget.deleted_by} />{:else}<span class="text-sm text-zinc-500">Unknown</span>{/if}
      </div>
      <div>
        <span class={label}>Deleted</span>
        <span class="text-sm text-zinc-300">{logTarget.deleted_at ? when(logTarget.deleted_at) : ''}</span>
      </div>
    </div>
    <div class="flex justify-end mt-5">
      <Button variant="secondary" onclick={() => (logTarget = null)}>Close</Button>
    </div>
  {/if}
</Modal>

<Modal show={!!deleteTarget} onClose={closeDelete}>
  {#if deleteTarget}
    <h3 class="flex items-center gap-2 font-display text-base font-bold text-zinc-100">
      <Trash2 class="w-4 h-4 shrink-0 text-red-400" />Delete quote #{deleteTarget.number}?
    </h3>
    <p class="text-xs text-zinc-400 mt-3 leading-relaxed">
      The quote is marked as deleted and its messages on Discord are removed, including the card and every published copy. The message cannot be quoted again.
    </p>
    <span class="{label} mt-4">Reason</span>
    <Input bind:value={deleteReason} maxlength={300} placeholder="Why is this quote being deleted?" aria-label="Reason" />
    <div class="flex justify-end gap-2 mt-5">
      <Button variant="ghost" onclick={closeDelete}>Cancel</Button>
      <Button variant="danger" onclick={confirmDelete} disabled={deleting || !deleteReason.trim()}>
        {deleting ? 'Deleting…' : 'Delete'}
      </Button>
    </div>
  {/if}
</Modal>
