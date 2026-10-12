<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type AuditLogEntry, type Pagination } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { ChevronLeft, ChevronRight, ScrollText } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { guildId }: { guildId: string } = $props();

  let logs: AuditLogEntry[] = $state([]);
  let pagination: Pagination | null = $state(null);
  let loading = $state(true);

  async function load(page = 1) {
    loading = true;
    try {
      const res = await api.auditLogs(guildId, page);
      logs = res.logs;
      pagination = res.pagination;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }
  onMount(() => load());

  const when = (ts: string) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<PageHeader title="Audit logs" description="Every configuration change made in this server" icon={ScrollText} />

<Card>
  {#if loading}
    <TableSkeleton columns={['w-32', 'w-40', 'w-40', 'flex-1']} rows={5} />
  {:else if logs.length === 0}
    <p class="text-sm text-slate-500 text-center py-8">Nothing recorded yet.</p>
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800/40">
          <th class="text-left py-3 px-3 font-medium w-32">When</th>
          <th class="text-left py-3 px-3 font-medium w-40">Actor</th>
          <th class="text-left py-3 px-3 font-medium w-40">Action</th>
          <th class="text-left py-3 px-3 font-medium">Details</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/30">
        {#each logs as log (log.id)}
          <tr>
            <td class="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">{when(log.created_at)}</td>
            <td class="py-3 px-3 text-[11px] text-slate-300 font-mono">{log.actor_id}</td>
            <td class="py-3 px-3 text-[12px] text-slate-200">{log.action}</td>
            <td class="py-3 px-3 text-[12px] text-slate-400">{log.reason ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if pagination && pagination.total_pages > 1}
      <div class="flex items-center justify-end gap-1 mt-3">
        <button onclick={() => load(pagination!.page - 1)} disabled={pagination.page <= 1} class="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30 cursor-pointer" aria-label="Previous page"><ChevronLeft class="w-4 h-4" /></button>
        <span class="text-[11px] text-slate-500">{pagination.page}/{pagination.total_pages}</span>
        <button onclick={() => load(pagination!.page + 1)} disabled={pagination.page >= pagination.total_pages} class="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30 cursor-pointer" aria-label="Next page"><ChevronRight class="w-4 h-4" /></button>
      </div>
    {/if}
  {/if}
</Card>
