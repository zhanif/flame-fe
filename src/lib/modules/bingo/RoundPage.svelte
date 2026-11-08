<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Combobox from '$lib/components/Combobox.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import FormSkeleton from '$lib/components/FormSkeleton.svelte';
  import RowMenu from '$lib/components/RowMenu.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SettingRow from '$lib/components/SettingRow.svelte';
  import { api, type BingoDesign, type BingoRound, type BingoTogetherMode } from '$lib/api/endpoints';
  import BingoAnswersGrid from '$lib/modules/bingo/BingoAnswersGrid.svelte';
  import BingoBoard from '$lib/modules/bingo/BingoBoard.svelte';
  import EntriesTab from '$lib/modules/bingo/EntriesTab.svelte';
  import { boardExporter } from '$lib/modules/bingo/board-export';
  import { missingQuestions, QUESTION_COUNT } from '$lib/modules/bingo/board';
  import { urlParam } from '$lib/url-param';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps } from '$lib/ui';
  import {
    ArrowLeft,
    Check,
    Download,
    Eye,
    EyeOff,
    ListOrdered,
    Palette,
    PencilRuler,
    RotateCcw,
    Save,
    Trash2,
    Users,
    X,
  } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let {
    guildId,
    roundId,
    isAdmin,
    onBack,
    onOpenDesign,
  }: {
    guildId: string;
    roundId: string;
    isAdmin: boolean;
    onBack: () => void;
    onOpenDesign: (designId: string, roundId?: string) => void;
  } = $props();

  let round: BingoRound | null = $state(null);
  let design: BingoDesign | null = $state(null);
  let designs = $state<BingoDesign[]>([]);
  let selectedDesignId = $state('');
  const segmentParam = urlParam('segment', 'board');
  const segment = $derived(segmentParam.value as 'board' | 'entries');
  let answers = $state('');
  let mode = $state<BingoTogetherMode>('off');
  let savingAnswers = $state(false);
  let exporting = $state(false);
  let previewAnswered = $state(false);
  let applying = $state(false);
  let deleting = $state(false);
  let busy = $state(false);

  const current = $derived.by((): BingoRound | null => round);
  const board = $derived.by((): BingoDesign | null => design);
  const ready = $derived(current?.board_ready ?? false);
  const missing = $derived(board ? missingQuestions(board.board) : []);
  const blank = $derived(missing.length === QUESTION_COUNT);
  const points = $derived(board?.board.points ?? []);

  const statusLabel = { open: 'Open', closed: 'Closed', ignored: 'Ignored' } as const;
  const statusTone = { open: 'success', closed: 'neutral', ignored: 'warning' } as const;
  const modeLabel: Record<BingoTogetherMode, string> = { off: 'Off', positive: 'Positive', negative: 'Negative' };

  async function load() {
    try {
      const [result, designList] = await Promise.all([api.bingo.round(guildId, roundId), api.bingo.designs(guildId)]);
      round = result.round;
      design = result.design;
      answers = result.round.correct_answers ?? '';
      mode = result.round.together_mode;
      designs = designList.designs;
    } catch (e: any) {
      toast('error', e.message);
      onBack();
    }
  }

  onMount(load);

  async function saveAnswers() {
    if (!current) return;
    savingAnswers = true;
    try {
      const result = await api.bingo.answers(guildId, current.id, answers);
      toast(
        'success',
        'Answers saved',
        result.rescored
          ? `${result.rescored} ${result.rescored === 1 ? 'entry was' : 'entries were'} rescored.`
          : 'No entry needed a new score.',
      );
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      savingAnswers = false;
    }
  }

  async function exportBoard() {
    if (!board || exporting) return;
    exporting = true;
    try {
      await boardExporter.download($state.snapshot(board.board));
      toast('success', 'Board exported', 'The PNG is in your downloads.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      exporting = false;
    }
  }

  async function exportAnsweredBoard() {
    if (!board || !current?.correct_answers || exporting) return;
    exporting = true;
    try {
      await boardExporter.download($state.snapshot(board.board), current.correct_answers);
      toast('success', 'Answered board exported', 'The PNG is in your downloads.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      exporting = false;
    }
  }

  async function exportAnswers() {
    if (!current || exporting) return;
    exporting = true;
    try {
      const { files } = await api.bingo.exportAnswers(guildId, current.id);
      files.forEach(file => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${file.data}`;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      toast('success', 'Answers exported', `${files.length} PNG ${files.length === 1 ? 'file' : 'files'} in your downloads.`);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      exporting = false;
    }
  }

  async function setMode(next: BingoTogetherMode) {
    if (!current) return;
    applying = true;
    try {
      const result = await api.bingo.together(guildId, current.id, next);
      toast(
        'success',
        `Together mode: ${modeLabel[next].toLowerCase()}`,
        `${result.granted} role${result.granted === 1 ? '' : 's'} added, ${result.removed} removed.`,
      );
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      applying = false;
    }
  }

  async function setStatus(status: 'open' | 'closed' | 'ignored') {
    if (!current) return;
    try {
      await api.bingo.setStatus(guildId, current.id, status);
      toast(
        'success',
        status === 'closed' ? 'Round finalized' : status === 'open' ? 'Round reopened' : 'Thread ignored',
        status === 'open' ? 'Members can submit answers again.' : undefined,
      );
      await load();
    } catch (e: any) {
      toast('error', e.message);
    }
  }

  async function remove() {
    if (!current) return;
    busy = true;
    try {
      await api.bingo.remove(guildId, current.id);
      toast('success', 'Round deleted');
      onBack();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
      deleting = false;
    }
  }

  const availableDesigns = $derived(designs.filter(d => !d.round_id));

  async function assignDesign() {
    if (!selectedDesignId) return;
    const source = designs.find(d => d.id === selectedDesignId);
    if (!source) return;
    busy = true;
    try {
      await api.bingo.updateDesign(guildId, source.id, { board: $state.snapshot(source.board), round_id: roundId });
      toast('success', 'Design assigned', 'The round now uses that design.');
      selectedDesignId = '';
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
    }
  }

  async function unlinkDesign() {
    if (!current?.design_id || busy) return;
    busy = true;
    try {
      if (design) await api.bingo.updateDesign(guildId, design.id, { board: $state.snapshot(design.board), round_id: null });
      toast('success', 'Design unlinked', 'The round no longer has this board. The design stays in the Designs tab.');
      await load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      busy = false;
    }
  }
</script>

<ConfirmModal
  show={deleting}
  title="Delete {current?.tag ?? 'this round'}?"
  confirmLabel="Delete round"
  busyLabel="Deleting…"
  {busy}
  onConfirm={remove}
  onClose={() => (deleting = false)}
>
  Its submissions, its correct answers and its board are removed. The thread in Discord stays, and a scan of the forum would create the
  round again.
</ConfirmModal>

{#if !current || !board}
  <div class="space-y-5" aria-hidden="true">
    <div class="h-9 w-64 rounded-lg bg-zinc-800/40 animate-pulse"></div>
    <Card><FormSkeleton fields={4} grid hint /></Card>
  </div>
{:else}
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-2">
        <Button variant="ghost" onclick={onBack} aria-label="Back to threads"><ArrowLeft class="h-4 w-4" /></Button>
        <div class="min-w-0">
          <p class="truncate font-mono text-sm font-semibold text-rose-300">{current.tag}</p>
          <p class="truncate text-xs text-zinc-500" title={current.thread_name}>{current.thread_name}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone[current.status]}>{statusLabel[current.status]}</Badge>
        {#if isAdmin}
          <RowMenu
            text="Export PNG"
            icon={Download}
            label="Export"
            items={[
              { label: 'Board', onclick: () => void exportBoard() },
              { label: 'Board (Answered)', onclick: () => void exportAnsweredBoard() },
              { label: 'Participant Answers', onclick: () => void exportAnswers() },
            ]}
          />
          <RowMenu
            items={[
              current.status === 'closed'
                ? { label: 'Reopen round', icon: RotateCcw, onclick: () => void setStatus('open') }
                : { label: 'Finalize round', icon: Check, disabled: current.status !== 'open', onclick: () => void setStatus('closed') },
              { label: 'Delete round', icon: Trash2, danger: true, onclick: () => (deleting = true) },
            ]}
            label="Round actions"
          />
        {/if}
      </div>
    </div>

    <SegmentedControl
      bind:value={segmentParam.value}
      label="Round view"
      options={[
        { id: 'board', label: 'Board' },
        { id: 'entries', label: 'Entries', count: current.entries },
      ]}
    />

    {#if segment === 'board'}
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div class="space-y-5">
          <Card>
            <SectionTitle icon={ListOrdered} title="Correct answers" class="mb-4" />
            {#if blank}
              <p class="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400 ring-1 ring-amber-500/25">
                Link a design to this round first. Answers can only be saved once the board is assigned.
              </p>
            {:else if !ready}
              <p class="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400 ring-1 ring-amber-500/25">
                The board is not ready yet, answers cannot be saved.
              </p>
            {/if}
            <BingoAnswersGrid bind:value={answers} disabled={!isAdmin || blank} {points} />
            <p class="mt-3 text-xs text-zinc-500">A wrong answer costs the same, a skipped bonus costs nothing.</p>
            {#if isAdmin}
              <div class="mt-4 flex justify-end border-t border-zinc-800/60 pt-4">
                <Button
                  variant="primary"
                  onclick={saveAnswers}
                  disabled={savingAnswers || blank || answers.replace(/[^YN-]/g, '').length !== 12}
                >
                  <Save class="h-3.5 w-3.5" />{savingAnswers ? 'Saving…' : 'Save answers'}
                </Button>
              </div>
            {/if}
          </Card>

          {#if isAdmin}
            <Card>
              <SectionTitle icon={Users} title="Together mode" class="mb-4" />
              {#if blank}
                <p class="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400 ring-1 ring-amber-500/25">
                  Link a design to this round first. Together mode can only be applied once the board is assigned.
                </p>
              {/if}
              <SettingRow
                title="Apply to the ranked participants"
                hint="The chosen role is given to every ranked participant and the other one is taken back. Members can join the same role with /bingo together."
              >
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <SegmentedControl
                    bind:value={mode}
                    label="Together mode"
                    options={[
                      { id: 'off', label: 'Off' },
                      { id: 'positive', label: 'Positive' },
                      { id: 'negative', label: 'Negative' },
                    ]}
                  />
                  <Button variant="secondary" onclick={() => setMode(mode)} disabled={applying || blank || mode === current.together_mode}>
                    {applying ? 'Applying…' : 'Apply'}
                  </Button>
                </div>
              </SettingRow>
              <p class="text-xs text-zinc-500">
                {current.together_mode === 'off'
                  ? 'Nothing is applied while the mode is off.'
                  : `The ${current.together_mode} role is applied to the ranked participants.`}
              </p>
            </Card>
          {/if}
        </div>

        <div class="space-y-3 xl:sticky xl:top-5 xl:self-start">
          {#if blank}
            <Card>
              <SectionTitle icon={Palette} title="No board yet" class="mb-3" />
              <p class="text-xs text-zinc-500">
                The 12 questions and the look are set in the designer. This round shows the card once the design has them.
              </p>
              {#if isAdmin}
                <div class="mt-4 flex flex-col gap-2">
                  <Button variant="primary" onclick={() => onOpenDesign('', current.id)}>
                    <PencilRuler class="h-3.5 w-3.5" />Create new design
                  </Button>
                  <div class="border-t border-zinc-800/60 pt-4">
                    <p class="mb-2 text-xs text-zinc-500">Or use a design that is already stored and not assigned to a round.</p>
                    <div class="flex flex-col gap-2 sm:flex-row">
                      <Combobox
                        bind:value={selectedDesignId}
                        options={availableDesigns.map(d => ({
                          value: d.id,
                          label: d.board.title.trim() || 'Untitled design',
                          hint: d.board.subtitle.trim() || undefined,
                        }))}
                        placeholder="Search a stored design..."
                        class="flex-1"
                      />
                      <Button variant="secondary" disabled={!selectedDesignId || busy} onclick={assignDesign}>
                        {busy ? 'Assigning…' : 'Use this design'}
                      </Button>
                    </div>
                    {#if availableDesigns.length === 0}
                      <p class="mt-2 text-xs text-zinc-500">No stored design is free right now. Duplicate one in the Designs tab first.</p>
                    {/if}
                  </div>
                </div>
              {/if}
            </Card>
          {:else}
            <div class="flex items-center justify-between">
              <span class="{caps} text-zinc-500">Preview</span>
              <span class="text-xs text-zinc-500">What Discord posts</span>
            </div>
            <BingoBoard board={board.board} answers={previewAnswered ? current.correct_answers : null} />
            <p class="text-xs text-zinc-500">
              {previewAnswered
                ? 'Green is Y, red is N, gray is a skipped bonus. The bands turn gray in this preview.'
                : 'Numbers are the board position, points are what the question is worth.'}
            </p>
            {#if isAdmin}
              <div class="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  class="w-full"
                  disabled={!current.has_answers}
                  onclick={() => (previewAnswered = !previewAnswered)}
                >
                  {#if previewAnswered}
                    <EyeOff class="h-3.5 w-3.5" />Hide answered preview
                  {:else}
                    <Eye class="h-3.5 w-3.5" />Preview answered board
                  {/if}
                </Button>
                <Button
                  variant="secondary"
                  class="w-full"
                  disabled={busy || (current?.entries ?? 0) > 0}
                  onclick={() => onOpenDesign(current.design_id ?? '', current.id)}
                >
                  <PencilRuler class="h-3.5 w-3.5" />{current.design_id ? 'Restyle design' : 'Create design'}
                </Button>
                <Button variant="secondary" class="w-full" disabled={busy || (current?.entries ?? 0) > 0} onclick={unlinkDesign}>
                  <X class="h-3.5 w-3.5" />Unlink design
                </Button>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    {:else}
      <EntriesTab {guildId} roundId={current.id} correctAnswers={current.correct_answers} />
    {/if}
  </div>
{/if}
