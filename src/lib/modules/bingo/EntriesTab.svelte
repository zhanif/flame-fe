<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type BingoEntry } from '$lib/api/endpoints';
  import { answersOf, MAIN_COUNT } from '$lib/modules/bingo/board';
  import { td, th } from '$lib/ui';
  import { toast } from '$lib/stores/toast.svelte';
  import { untrack } from 'svelte';

  // The submissions of a round, best score first. A wrong answer sits on a red box; a skipped bonus is dashed.
  let { guildId, roundId, correctAnswers }: { guildId: string; roundId: string; correctAnswers: string | null } = $props();

  let entries: BingoEntry[] = $state([]);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let loaded = $state(false);
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      const result = await api.bingo.entries(guildId, roundId, { page, limit });
      entries = result.entries;
      total = result.pagination.total;
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void [page, limit, roundId];
    untrack(() => void load());
  });

  const answers = (entry: BingoEntry) => answersOf(entry.answers);

  function cellClass(entry: BingoEntry, index: number): string {
    const answer = entry.answers[index] ?? '-';
    if (!correctAnswers) return 'text-zinc-300';
    if (answer === '-') return 'text-zinc-500';
    return answer === correctAnswers[index] ? 'text-zinc-200' : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
  }

  const goTo = (next: number) => (page = next);
  const setLimit = (next: number) => {
    limit = next;
    page = 1;
  };
</script>

{#if !loaded}
  <Card flush>
    <TableSkeleton
      columns={['w-16', 'flex-1', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', 'w-8', '>w-20', '>w-16', '>w-24']}
      rows={limit}
      headings={['#', 'Member', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Score', 'Pos', 'Ranked']}
    />
  </Card>
{:else if total === 0}
  <EmptyState
    kind="search"
    title="No submissions yet"
    description="Members submit by sending their 12 answers in the round's thread. They show up here as they arrive."
  />
{:else}
  <Card flush>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-zinc-800/60">
            <th class="{th} w-16">#</th>
            <th class="{th}">Member</th>
            {#each Array(12) as _, index}
              <th class="{th} w-9 text-center {index >= MAIN_COUNT ? 'text-rose-400' : ''}">{index + 1}</th>
            {/each}
            <th class="{th} w-24 text-right">Score</th>
            <th class="{th} w-16 text-right">Pos</th>
            <th class="{th} w-24">Ranked</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/30">
          {#each entries as entry, index (entry.id)}
            <tr>
              <td class="{td} w-16 text-zinc-500">{(page - 1) * limit + index + 1}</td>
              <td class="{td}">
                <p class="truncate text-xs font-semibold text-zinc-100">{entry.user_name || 'Unknown member'}</p>
                <p class="truncate font-mono text-[11px] text-zinc-500" title={entry.user_id}>{entry.user_id}</p>
              </td>
              {#each answers(entry) as answer, position (position)}
                <td class="{td} w-9 text-center"
                  ><span class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold {cellClass(entry, position)}">{answer || '-'}</span></td
                >
              {/each}
              <td class="{td} w-24 text-right font-semibold text-zinc-100">{entry.final_score.toLocaleString('en-US')}</td>
              <td class="{td} w-16 text-right text-zinc-400">{entry.position ?? '-'}</td>
              <td class="{td} w-24">
                <span class="text-xs {entry.is_ranked ? 'text-zinc-300' : 'text-zinc-500'}">{entry.is_ranked ? 'Ranked' : 'Unranked'}</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="border-t border-zinc-800/60">
      <Pagination {page} {limit} {total} onPage={goTo} onLimit={setLimit} disabled={loading} />
    </div>
  </Card>
{/if}
