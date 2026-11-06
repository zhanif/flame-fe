<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import RowMenu, { type RowMenuItem } from '$lib/components/RowMenu.svelte';
  import TableSkeleton from '$lib/components/TableSkeleton.svelte';
  import { api, type BingoConfig, type BingoDesign, type BingoRound } from '$lib/api/endpoints';
  import BoardEditor from '$lib/modules/bingo/BoardEditor.svelte';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, td, th } from '$lib/ui';
  import { Copy, Paintbrush, Plus, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  // Boards stored for this server. A design lives on its own, whether or not a round exists, and can be assigned
  // to a round without being part of it.
  let {
    guildId,
    config,
    isAdmin,
    designId,
    initialRoundId,
    onOpen,
    onClose,
  }: {
    guildId: string;
    config: BingoConfig;
    isAdmin: boolean;
    designId: string;
    initialRoundId: string;
    onOpen: (designId: string, roundId?: string) => void;
    onClose: () => void;
  } = $props();

  let designs = $state<BingoDesign[]>([]);
  let rounds = $state<BingoRound[]>([]);
  let loaded = $state(false);
  let deleting = $state<BingoDesign | null>(null);
  let busy = $state(false);

  const editing = $derived(designId !== '');
  const editingDesign = $derived(designId && designId !== 'new' ? designs.find(design => design.id === designId) ?? null : null);
  const missing = $derived(editing && designId !== 'new' && loaded && !editingDesign);
  const titleOf = (design: BingoDesign) => design.board.title.trim() || 'Untitled design';
  const dateOf = (design: BingoDesign) => (design.updated_at ? new Date(design.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '');

  const cell = td.replace('h-11', 'h-14');

  const actions = (design: BingoDesign): RowMenuItem[] => [
    { label: 'Restyle', icon: Paintbrush, onclick: () => onOpen(design.id, design.round_id ?? '') },
    ...(isAdmin
      ? [
          { label: 'Duplicate', icon: Copy, onclick: () => duplicate(design) },
          { label: 'Delete', icon: Trash2, danger: true, onclick: () => (deleting = design) },
        ]
      : []),
  ];

  /** A copy of the whole board with the same look, assigned to no round: the round stays where it is. */
  async function duplicate(design: BingoDesign) {
    if (busy) return;
    busy = true;
    try {
      const created = await api.bingo.createDesign(guildId, { board: $state.snapshot(design.board), round_id: null });
      designs = [created, ...designs];
      toast('success', 'Design duplicated', 'The copy keeps the questions and the look, and is assigned to no round.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
    }
  }

  async function load() {
    try {
      const [designList, roundList] = await Promise.all([api.bingo.designs(guildId), api.bingo.rounds(guildId, { page: 1, limit: 100 })]);
      designs = designList.designs;
      rounds = roundList.rounds;
      loaded = true;
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  onMount(load);

  function saved(next: BingoDesign) {
    designs = designs.some(design => design.id === next.id) ? designs.map(design => (design.id === next.id ? next : design)) : [next, ...designs];
    if (designId === 'new') onOpen(next.id, next.round_id ?? '');
  }

  async function remove() {
    if (!deleting) return;
    busy = true;
    try {
      await api.bingo.removeDesign(guildId, deleting.id);
      toast('success', 'Design deleted', deleting.round_id ? 'The round stays; it no longer has this board.' : 'The stored board is gone.');
      deleting = null;
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
    }
  }
</script>

<ConfirmModal
  show={!!deleting}
  title="Delete {deleting ? titleOf(deleting) : 'this design'}?"
  confirmLabel="Delete design"
  busyLabel="Deleting…"
  {busy}
  onConfirm={remove}
  onClose={() => (deleting = null)}
>
  The stored board goes away. {deleting?.round_id ? 'The round stays and loses its board; it can be designed again.' : 'No round is affected.'}
</ConfirmModal>

{#if editing}
  {#if editingDesign || designId === 'new'}
    {#key designId}
      <BoardEditor
        {guildId}
        design={editingDesign}
        {rounds}
        {initialRoundId}
        defaults={config.defaults.board}
        limits={config.limits}
        {isAdmin}
        onSaved={saved}
        onCancel={onClose}
        backLabel={initialRoundId ? 'Back to round' : 'Back to designs'}
      />
    {/key}
  {:else if missing}
    <Card>
      <p class="text-sm text-zinc-300">That design no longer exists.</p>
      <div class="mt-4 flex justify-end"><Button variant="secondary" onclick={onClose}>Back to designs</Button></div>
    </Card>
  {:else}
    <Card>
      <div class="space-y-2" aria-hidden="true">
        <div class="h-9 w-64 rounded-lg bg-zinc-800/40 animate-pulse"></div>
        <div class="h-28 rounded-xl bg-zinc-800/30 animate-pulse"></div>
      </div>
    </Card>
  {/if}
{:else}
  <div class="space-y-5">
    {#if isAdmin}
      <div class="flex justify-end">
        <Button variant="primary" onclick={() => onOpen('new')}><Plus class="w-3.5 h-3.5" />New design</Button>
      </div>
    {/if}

    {#if loaded && designs.length === 0}
      <EmptyState
        kind="modules"
        title="No designs yet"
        description="Design the 12 questions, their points and the look of the card. A design is stored on its own and can be assigned to a round later."
      />
    {:else}
      <Card flush>
        {#if !loaded}
          <TableSkeleton
            columns={['w-16', 'flex-1', 'w-40', 'w-44', 'w-16']}
            headings={['#', 'Design', 'Round', 'Updated', '']}
            kinds={['bar', 'bar', 'pill', 'bar', 'action']}
            rows={4}
            rowHeight="h-14"
          />
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800/40 bg-zinc-800/20">
                <th class="{th} w-16">#</th>
                <th class={th}>Design</th>
                <th class="{th} w-40">Round</th>
                <th class="{th} w-44">Updated</th>
                <th class="{th} w-16"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/30">
              {#each designs as design, index (design.id)}
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="{cell} text-zinc-500">{index + 1}</td>
                  <td class="{cell} text-zinc-200">
                    <p class="truncate">{titleOf(design)}</p>
                    <p class="truncate text-xs text-zinc-500">{design.board.subtitle.trim() || 'No subtitle'}</p>
                  </td>
                  <td class={cell}>
                    {#if design.round_tag}
                      <span class="font-mono text-xs text-zinc-200">{design.round_tag}</span>
                    {:else}
                      <span class="{caps} text-zinc-500">Not assigned</span>
                    {/if}
                  </td>
                  <td class="{cell} text-xs text-zinc-500">{dateOf(design)}</td>
                  <td class="{cell} text-right"><RowMenu label="Actions for {titleOf(design)}" items={actions(design)} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </Card>
    {/if}
  </div>
{/if}
