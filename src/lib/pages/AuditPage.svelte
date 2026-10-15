<script lang="ts">
  import ActorCell from '$lib/components/ActorCell.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import DateRangePicker from '$lib/components/DateRangePicker.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Input from '$lib/components/Input.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Select from '$lib/components/Select.svelte';
  import ControlSkeleton from '$lib/components/ControlSkeleton.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type AuditFilters, type AuditLogEntry, type AuditQuery } from '$lib/api/endpoints';
  import { moduleCatalog } from '$lib/stores/modules.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { urlNumber, urlParam } from '$lib/url-param';
  import { actionTone } from '$lib/nav';
  import { td, th } from '$lib/ui';

  // Audit rows carry badges and avatars, so they get more vertical room than the default.
  const cell = td.replace('h-11', 'h-14');
  import { Search, X } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  let { guildId }: { guildId: string } = $props();

  let logs: AuditLogEntry[] = $state([]);
  let limit = $state(10);
  let total = $state(0);
  let loading = $state(true);
  let loaded = $state(false);

  let filters: AuditFilters = $state({ actions: [], actors: [] });
  let filtersLoaded = $state(false);
  // Every filter and the page live in the address (`?q=&action=&actor=&from=&to=&module=&page=`): a link opens the
  // same view, Back goes one step, and the Modules cards can link straight to one module's trail.
  const pageParam = urlNumber('page');
  const qParam = urlParam('q');
  const actionParam = urlParam('action');
  const actorParam = urlParam('actor');
  const fromParam = urlParam('from');
  const toParam = urlParam('to');
  const moduleParam = urlParam('module');
  const page = $derived(pageParam.value);
  const search = $derived(qParam.value);
  const action = $derived(actionParam.value);
  const actor = $derived(actorParam.value);
  const from = $derived(fromParam.value);
  const to = $derived(toParam.value);
  const module = $derived(moduleParam.value);
  // The search box is typed in freely and written to the address after a pause.
  let searchText = $state(qParam.value);
  $effect(() => {
    searchText = qParam.value;
  });

  const hasFilters = $derived(!!(search.trim() || action || actor || from || to || module));

  // A date input holds a local calendar day; send it as the instants that day starts and ends.
  const startOf = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined);
  const endOf = (day: string) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined);

  let request = 0;
  async function load() {
    const mine = ++request;
    loading = true;
    try {
      const query: AuditQuery = { page, limit, action, actor, module, q: search.trim(), from: startOf(from), to: endOf(to) };
      const res = await api.auditLogs(guildId, query);
      if (mine !== request) return;
      logs = res.logs;
      total = res.pagination.total;
      loaded = true;
    } catch (e: any) {
      if (mine === request) toast('error', e.message);
    } finally {
      if (mine === request) loading = false;
    }
  }

  // The log is read whenever a filter, the page or its size changes, the browser's Back included.
  $effect(() => {
    void [page, limit, search, action, actor, from, to, module];
    untrack(() => void load());
  });

  onMount(() => {
    api.auditFilters(guildId).then(f => ((filters = f), (filtersLoaded = true))).catch(() => (filtersLoaded = true));
  });

  const goTo = (p: number) => (pageParam.value = p);
  function setLimit(l: number) {
    limit = l;
    pageParam.value = 1;
  }
  // Any filter change goes back to the first page.
  const refilter = () => (pageParam.value = 1);
  let typing: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(typing);
    typing = setTimeout(() => {
      qParam.value = searchText.trim();
      refilter();
    }, 300);
  }
  const clear = () => router.setQuery({ q: null, action: null, actor: null, from: null, to: null, module: null, page: null });

  const when = (ts: string) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<PageHeader page="audit" description="Every configuration change made in this server" />

<div class="flex flex-wrap items-center gap-3 mb-5">
  <Input bind:value={searchText} icon={Search} type="search" placeholder="Search details or actor" aria-label="Search details or actor" oninput={onSearch} class="w-full sm:w-72" />
  {#if filtersLoaded && !moduleCatalog.loading}
    <Select
      bind:value={moduleParam.value}
      onchange={refilter}
      placeholder="All modules"
      label="Module"
      options={moduleCatalog.entries.filter(m => m.installed).map(m => ({ value: m.id, label: m.name }))}
      class="w-44"
    />
    <Select bind:value={actionParam.value} onchange={refilter} placeholder="All actions" label="Action" options={filters.actions.map(a => ({ value: a, label: a }))} class="w-44" />
    <Select bind:value={actorParam.value} onchange={refilter} placeholder="All actors" label="Actor" options={filters.actors.map(a => ({ value: a.id, label: a.name ?? a.id }))} class="w-44" />
  {:else}
    <ControlSkeleton class="w-44" />
    <ControlSkeleton class="w-44" />
    <ControlSkeleton class="w-44" />
  {/if}
  <DateRangePicker bind:from={fromParam.value} bind:to={toParam.value} onchange={refilter} class="w-64" />
  {#if hasFilters}
    <Button variant="ghost" onclick={clear}><X class="w-3.5 h-3.5" /> Clear</Button>
  {/if}
</div>

{#if loaded && total === 0}
  {#if hasFilters}
    <EmptyState kind="search" title="No entries match these filters" description="Try a different search or date range." />
  {:else}
    <EmptyState kind="log" title="Nothing recorded yet" description="Configuration changes will show up here." />
  {/if}
{:else}
<Card flush>
  {#if !loaded}
    <TableSkeleton
            columns={['w-16', 'w-32', 'w-64', 'w-44', 'flex-1']}
            headings={['#', 'When', 'Actor', 'Action', 'Details']}
            kinds={['bar', 'bar', 'actor', 'pill', 'bar']}
            rows={5}
            rowHeight="h-14"
    />
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
          <th class="{th} w-16">#</th>
          <th class="{th} w-32">When</th>
          <th class="{th} w-64">Actor</th>
          <th class="{th} w-44">Action</th>
          <th class={th}>Details</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-800/30">
        {#each logs as log, i (log.id)}
          <tr class="hover:bg-zinc-800/30 transition-colors">
            <td class="{cell} text-zinc-600">{(page - 1) * limit + i + 1}</td>
            <td class="{cell} text-zinc-500 whitespace-nowrap">{when(log.created_at)}</td>
            <td class={cell}><ActorCell actor={log.actor} /></td>
            <td class={cell}><Badge tone={actionTone(log.action)}>{log.action}</Badge></td>
            <td class="{cell} text-zinc-400">{log.reason ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
  {/if}
</Card>
{/if}
