<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import RowMenu from '$lib/components/RowMenu.svelte';
  import Select from '$lib/components/Select.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type BingoRound, type BingoRoundStatus } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { td, th } from '$lib/ui';
  import { Check, PencilRuler, RotateCcw, Trash2 } from '@lucide/svelte';
  import { untrack } from 'svelte';

  // The rounds of this server: one per thread whose first message carried the tag.
  let { guildId, isAdmin, onOpen }: { guildId: string; isAdmin: boolean; onOpen: (roundId: string) => void } = $props();

  let rounds: BingoRound[] = $state([]);
  let filter = $state('');
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);
  let deleting: BingoRound | null = $state(null);
  let busy = $state(false);

  async function load() {
    loading = true;
    try {
      const result = await api.bingo.rounds(guildId, { page, limit, status: filter || undefined });
      rounds = result.rounds;
      total = result.pagination.total;
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void [page, limit, filter];
    untrack(() => void load());
  });

  const setLimit = (next: number) => {
    limit = next;
    page = 1;
  };
  async function setStatus(round: BingoRound, status: BingoRoundStatus) {
    try {
      await api.bingo.setStatus(guildId, round.id, status);
      toast('success', status === 'closed' ? 'Round closed' : status === 'ignored' ? 'Thread ignored' : 'Round reopened', round.tag);
      await load();
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  async function remove() {
    if (!deleting) return;
    busy = true;
    try {
      await api.bingo.remove(guildId, deleting.id);
      toast('success', 'Round deleted', 'Its submissions and its board went with it.');
      deleting = null;
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
    }
  }

  const statusLabel = { open: 'Open', closed: 'Closed', ignored: 'Ignored' } as const;
</script>

<ConfirmModal
  show={!!deleting}
  title="Delete {deleting?.tag ?? 'this round'}?"
  confirmLabel="Delete round"
  busyLabel="Deleting…"
  {busy}
  onConfirm={remove}
  onClose={() => (deleting = null)}
>
  Its submissions, its correct answers and its board are removed. The thread in Discord stays, and a scan of the forum would create the round again.
</ConfirmModal>

<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <Select
      bind:value={filter}
      options={[
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'ignored', label: 'Ignored' },
      ]}
      placeholder="All statuses"
      label="Status"
      onchange={() => (page = 1)}
      class="w-44"
    />
    <span class="text-xs text-zinc-500">{loading ? 'Reading…' : `${total} round${total === 1 ? '' : 's'}`}</span>
  </div>

  {#if !loaded}
    <Card flush>
      <TableSkeleton columns={['w-16', 'flex-1', 'flex-1', 'w-28', 'w-24', '>w-20', '>w-24', '>w-12']} rows={limit} headings={['#', 'Tag', 'Thread', 'Status', 'Design', 'Entries', 'Top score', '']} />
    </Card>
  {:else if total === 0}
    <EmptyState
      kind="search"
      title={filter ? 'No rounds match' : 'No rounds yet'}
      description={filter
        ? 'Try another status.'
        : 'Create a thread in the bingo forum whose first message carries the tag, then scan the forum from Settings if it was made before.'}
    />
  {:else}
    <Card flush>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-zinc-800/60">
              <th class="{th} w-16">#</th>
              <th class="{th}">Tag</th>
              <th class="{th}">Thread</th>
              <th class="{th} w-28">Status</th>
              <th class="{th} w-24">Board</th>
              <th class="{th} w-20 text-right">Entries</th>
              <th class="{th} w-24 text-right">Top score</th>
              <th class="{th} w-12"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/30">
            {#each rounds as round, index (round.id)}
              <tr class="transition hover:bg-zinc-800/20">
                <td class="{td} w-16 text-zinc-500">{(page - 1) * limit + index + 1}</td>
                <td class="{td}">
                  <button type="button" onclick={() => onOpen(round.id)} class="cursor-pointer font-mono text-xs font-semibold text-rose-300 hover:underline">{round.tag}</button>
                </td>
                <td class="{td}"><p class="max-w-[22rem] truncate text-xs text-zinc-300" title={round.thread_name}>{round.thread_name}</p></td>
                <td class="{td} w-28"><span class="text-xs text-zinc-300">{statusLabel[round.status]}</span></td>
                <td class="{td} w-24">
                  <span class="text-xs {round.board_ready ? 'text-zinc-300' : round.has_design ? 'text-amber-400' : 'text-zinc-500'}">
                    {round.board_ready ? 'Ready' : round.has_design ? 'Draft' : 'None'}
                  </span>
                </td>
                <td class="{td} w-20 text-right text-zinc-300">{round.entries}</td>
                <td class="{td} w-24 text-right text-zinc-300">{round.top_score === null ? '-' : round.top_score.toLocaleString('en-US')}</td>
                <td class="{td} w-12 text-right">
                  <RowMenu
                    items={[
                      { label: 'View round', icon: PencilRuler, onclick: () => onOpen(round.id) },
                      round.status === 'closed'
                        ? { label: 'Reopen round', icon: RotateCcw, disabled: !isAdmin, onclick: () => void setStatus(round, 'open') }
                        : { label: 'Finalize round', icon: Check, disabled: !isAdmin || round.status !== 'open', onclick: () => void setStatus(round, 'closed') },
                      { label: 'Delete round', icon: Trash2, danger: true, disabled: !isAdmin, onclick: () => (deleting = round) },
                    ]}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="border-t border-zinc-800/60">
        <Pagination {page} {limit} {total} onPage={p => (page = p)} onLimit={setLimit} disabled={loading} />
      </div>
    </Card>
  {/if}
</div>
