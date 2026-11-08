<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ColorField from '$lib/components/ColorField.svelte';
  import Combobox from '$lib/components/Combobox.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import SaveButton from '$lib/components/SaveButton.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import BingoBoard from '$lib/modules/bingo/BingoBoard.svelte';
  import { boardExporter } from '$lib/modules/bingo/board-export';
  import { cloneBoard, cloneStyle, missingQuestions, QUESTION_COUNT, sameBoard } from '$lib/modules/bingo/board';
  import { api, type BingoBoard as Board, type BingoDesign, type BingoLimits, type BingoRound } from '$lib/api/endpoints';
  import { toast } from '$lib/stores/toast.svelte';
  import { caps, label } from '$lib/ui';
  import { ArrowLeft, Coins, Download, Eye, EyeOff, Palette, Plus, Shuffle, Trophy } from '@lucide/svelte';
  import { untrack } from 'svelte';

  // A board stored on its own. It can be assigned to a round, but nothing forces it: a design exists whether or
  // not a round does, and saving it only records the board.
  let {
    guildId,
    design,
    rounds,
    initialRoundId = '',
    defaults,
    limits,
    isAdmin,
    onSaved,
    onCancel,
    backLabel = 'Back to designs',
  }: {
    guildId: string;
    design: BingoDesign | null;
    rounds: BingoRound[];
    initialRoundId?: string;
    defaults: Board;
    limits: BingoLimits;
    isAdmin: boolean;
    onSaved: (design: BingoDesign) => void;
    onCancel: () => void;
    backLabel?: string;
  } = $props();

  let board = $state<Board>(cloneBoard(untrack(() => design?.board ?? defaults)));
  let roundId = $state(untrack(() => design?.round_id ?? initialRoundId));
  let designId = $state(untrack(() => design?.id ?? ''));
  let saving = $state(false);
  let exporting = $state(false);
  let previewAnswered = $state(false);
  let pasting = $state(false);
  let pasteText = $state('');
  let pasteError = $state('');

  // Only a different stored design replaces the editor. Typing does not, because this effect never reads `board`.
  let synced = $state(untrack(() => (design ? JSON.stringify(design.board) : '')));
  $effect(() => {
    const next = design?.board;
    if (!next) return;
    const key = JSON.stringify(next);
    if (key === synced) return;
    synced = key;
    board = cloneBoard(next);
    roundId = design?.round_id ?? '';
    designId = design?.id ?? '';
  });

  const empty = $derived(missingQuestions(board));
  const dirty = $derived(!design || !sameBoard(board, design.board) || roundId !== (design.round_id ?? ''));
  const main = $derived(Array.from({ length: 9 }, (_, index) => index + 1));
  const bonus = $derived(Array.from({ length: QUESTION_COUNT - 9 }, (_, index) => index + 10));
  const groups = $derived([
    { heading: 'Main', positions: main },
    { heading: 'Bonus', positions: bonus },
  ]);
  const roundOptions = $derived([
    { value: '', label: 'Not assigned' },
    ...rounds.map(round => ({ value: round.id, label: round.tag, hint: round.thread_name })),
  ]);
  const selectedRound = $derived(rounds.find(round => round.id === roundId) ?? null);
  const previewAnswers = $derived(previewAnswered ? (selectedRound?.correct_answers ?? null) : null);
  const heading = $derived(design?.id ? board.title.trim() || 'Untitled design' : 'New design');

  async function save() {
    if (saving) return;
    saving = true;
    const created = !designId;
    try {
      const body = { board: $state.snapshot(board) as Board, round_id: roundId || null };
      const saved = designId ? await api.bingo.updateDesign(guildId, designId, body) : await api.bingo.createDesign(guildId, body);
      designId = saved.id;
      synced = JSON.stringify(saved.board);
      onSaved(saved);
      toast(
        'success',
        created ? 'Design created' : 'Design saved',
        saved.rescored
          ? `${saved.rescored} ${saved.rescored === 1 ? 'entry was' : 'entries were'} rescored.`
          : roundId
            ? 'The board is stored for that round.'
            : 'The board is stored on its own.',
      );
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      saving = false;
    }
  }

  function resetStyle() {
    board.style = cloneStyle(defaults.style);
  }

  async function download() {
    if (exporting) return;
    exporting = true;
    try {
      await boardExporter.download($state.snapshot(board) as Board);
      toast('success', 'Board exported', 'The PNG is in your downloads.');
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      exporting = false;
    }
  }

  // The nine main questions change places; their points stay where they are, and the bonus column is left alone.
  function shuffle() {
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let index = order.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    const questions = [...board.questions];
    order.forEach((from, to) => {
      questions[to] = board.questions[from];
    });
    board.questions = questions;
  }

  function openPaste() {
    pasteText = board.questions.join('\n');
    pasteError = '';
    pasting = true;
  }

  function applyPaste() {
    const lines = pasteText.split('\n').map(line => line.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    if (lines.length !== QUESTION_COUNT) {
      pasteError = `That is ${lines.length} line${lines.length === 1 ? '' : 's'}, not ${QUESTION_COUNT}`;
      return;
    }
    const tooLong = lines.findIndex(line => line.length > limits.question);
    if (tooLong !== -1) {
      pasteError = `Line ${tooLong + 1} is longer than ${limits.question} characters`;
      return;
    }
    board.questions = lines;
    pasting = false;
  }

  function setPoints(position: number, raw: string) {
    const value = Number(raw.replace(/\D/g, '')) || 0;
    board.points = board.points.map((point, index) => (index === position - 1 ? value : point));
  }

  function setRadius(raw: string) {
    const value = Math.min(28, Number(raw.replace(/\D/g, '')) || 0);
    board.style = { ...board.style, radius: value };
  }

  function setQuestion(position: number, value: string) {
    board.questions = board.questions.map((question, index) => (index === position - 1 ? value : question));
  }
</script>

<Modal show={pasting} onClose={() => (pasting = false)}>
  <SectionTitle icon={Plus} title="Paste 12 questions" class="mb-2" />
  <p class="mb-3 text-xs text-zinc-500">One per line, in the board's positions: 1, 2, 3, 10, 4, 5, 6, 11, 7, 8, 9, 12.</p>
  <Textarea bind:value={pasteText} rows={12} class="mb-2" aria-label="Questions, one per line" />
  {#if pasteError}<p class="mb-2 text-xs text-red-400">{pasteError}</p>{/if}
  <div class="flex justify-end gap-2">
    <Button variant="ghost" onclick={() => (pasting = false)}>Cancel</Button>
    <Button variant="primary" onclick={applyPaste}>Use these 12</Button>
  </div>
</Modal>

<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <Button variant="ghost" size="icon" aria-label={backLabel} title={backLabel} onclick={onCancel}>
        <ArrowLeft class="w-4 h-4" />
      </Button>
      <div class="min-w-0">
        <h2 class="truncate font-display text-lg font-bold text-zinc-100">{heading}</h2>
        <p class="text-xs text-zinc-500">{design?.id ? 'Editing a saved board' : 'A board saved on its own, before any round'}</p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" onclick={download} disabled={exporting}
        ><Download class="w-3.5 h-3.5" />{exporting ? 'Exporting…' : 'Export PNG'}</Button
      >
      {#if isAdmin}
        <SaveButton onclick={save} disabled={!dirty} {saving} />
      {/if}
    </div>
  </div>

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
    <div class="space-y-5">
      <Card>
        <SectionTitle icon={Palette} title="The board" class="mb-4" />
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <span class={label}>Title</span>
            <Input bind:value={board.title} maxlength={limits.title} disabled={!isAdmin} placeholder="Bingo" />
          </div>
          <div>
            <span class={label}>Subtitle</span>
            <Input bind:value={board.subtitle} maxlength={limits.subtitle} disabled={!isAdmin} placeholder="Chapter 32" />
          </div>
          <div>
            <span class={label}>Footer</span>
            <Input bind:value={board.footer} maxlength={limits.footer} disabled={!isAdmin} placeholder="Good luck" />
          </div>
          <div>
            <span class={label}>Round</span>
            <Combobox bind:value={roundId} options={roundOptions} placeholder="Search a round..." label="Round" disabled={!isAdmin} />
          </div>
        </div>
        <p class="mt-3 text-xs text-zinc-500">Picking a round makes this its board. Left unassigned, the design stays in the library.</p>
      </Card>

      <Card>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle icon={Trophy} title="Questions" />
          {#if isAdmin}
            <div class="flex gap-1.5">
              <Button variant="ghost" size="sm" onclick={openPaste}><Plus class="w-3.5 h-3.5" />Paste 12</Button>
              <Button variant="ghost" size="sm" onclick={shuffle}><Shuffle class="w-3.5 h-3.5" />Shuffle</Button>
            </div>
          {/if}
        </div>

        <div class="mb-1.5 flex items-center gap-2 px-0.5 text-zinc-500">
          <span class="w-7 shrink-0"></span>
          <span class="{caps} flex-1">Question</span>
          <span class="{caps} flex w-24 shrink-0 items-center gap-1"><Coins class="w-3 h-3" />Points</span>
        </div>

        <div class="divide-y divide-zinc-800/40">
          {#each groups as group (group.heading)}
            <p class="px-0.5 pb-2 pt-3 {caps} text-zinc-500">{group.heading}</p>
            {#each group.positions as position (position)}
              <div class="flex items-center gap-2 py-1.5">
                <span
                  class="flex h-6 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/70 font-mono text-[11px] font-semibold text-zinc-400"
                  >{position}</span
                >
                <div class="min-w-0 flex-1">
                  <Input
                    value={board.questions[position - 1] ?? ''}
                    maxlength={limits.question}
                    disabled={!isAdmin}
                    aria-label="Question {position}"
                    placeholder="Question {position}"
                    oninput={e => setQuestion(position, e.currentTarget.value)}
                  />
                </div>
                <div class="w-24 shrink-0">
                  <Input
                    value={String(board.points[position - 1] ?? 0)}
                    inputmode="numeric"
                    maxlength={6}
                    disabled={!isAdmin}
                    aria-label="Points for question {position}"
                    class="text-right tabular-nums"
                    oninput={e => setPoints(position, e.currentTarget.value)}
                  />
                </div>
              </div>
            {/each}
          {/each}
        </div>
        {#if empty.length}
          <p class="mt-3 text-xs text-amber-400">
            {empty.length} question{empty.length === 1 ? '' : 's'} still empty. The board saves as a draft but cannot be posted until all 12 are
            in.
          </p>
        {/if}
      </Card>

      <Card>
        <SectionTitle icon={Palette} title="Look" class="mb-4" />
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ColorField bind:value={board.style.background} label="Background" disabled={!isAdmin} />
          <ColorField bind:value={board.style.tile} label="Cell" disabled={!isAdmin} />
          <ColorField bind:value={board.style.text} label="Question text" disabled={!isAdmin} />
          <ColorField bind:value={board.style.title_color} label="Title text" disabled={!isAdmin} />
          <ColorField bind:value={board.style.subtitle_color} label="Subtitle text" disabled={!isAdmin} />
          <div>
            <span class={label}>Corner radius</span>
            <Input
              value={String(board.style.radius)}
              inputmode="numeric"
              maxlength={2}
              disabled={!isAdmin}
              aria-label="Corner radius"
              oninput={e => setRadius(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="mt-5 border-t border-zinc-800/60 pt-4">
          <span class="{caps} text-zinc-500">Bands</span>
          <p class="mt-1 text-xs text-zinc-500">
            The band holds the number and the points. Box is the nine main cells, Bonus 1 to 3 are cells 10, 11 and 12.
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-zinc-800/60 p-3">
              <p class="mb-2 text-xs font-semibold text-zinc-200">Box</p>
              <div class="grid grid-cols-2 gap-3">
                <ColorField bind:value={board.style.box.color} label="Color" disabled={!isAdmin} />
                <ColorField bind:value={board.style.box.text} label="Text" disabled={!isAdmin} />
              </div>
            </div>
            <div class="rounded-lg border border-zinc-800/60 p-3">
              <p class="mb-2 text-xs font-semibold text-zinc-200">Bonus 1</p>
              <div class="grid grid-cols-2 gap-3">
                <ColorField bind:value={board.style.bonus_1.color} label="Color" disabled={!isAdmin} />
                <ColorField bind:value={board.style.bonus_1.text} label="Text" disabled={!isAdmin} />
              </div>
            </div>
            <div class="rounded-lg border border-zinc-800/60 p-3">
              <p class="mb-2 text-xs font-semibold text-zinc-200">Bonus 2</p>
              <div class="grid grid-cols-2 gap-3">
                <ColorField bind:value={board.style.bonus_2.color} label="Color" disabled={!isAdmin} />
                <ColorField bind:value={board.style.bonus_2.text} label="Text" disabled={!isAdmin} />
              </div>
            </div>
            <div class="rounded-lg border border-zinc-800/60 p-3">
              <p class="mb-2 text-xs font-semibold text-zinc-200">Bonus 3</p>
              <div class="grid grid-cols-2 gap-3">
                <ColorField bind:value={board.style.bonus_3.color} label="Color" disabled={!isAdmin} />
                <ColorField bind:value={board.style.bonus_3.text} label="Text" disabled={!isAdmin} />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
          <div class="flex flex-wrap gap-6">
            <label class="flex items-center gap-2 text-xs text-zinc-300">
              <Toggle
                on={board.style.show_numbers}
                disabled={!isAdmin}
                label="Show numbers"
                onclick={() => (board.style = { ...board.style, show_numbers: !board.style.show_numbers })}
              />
              Numbers
            </label>
            <label class="flex items-center gap-2 text-xs text-zinc-300">
              <Toggle
                on={board.style.show_points}
                disabled={!isAdmin}
                label="Show points"
                onclick={() => (board.style = { ...board.style, show_points: !board.style.show_points })}
              />
              Points
            </label>
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedRound?.correct_answers}
              onclick={() => (previewAnswered = !previewAnswered)}
            >
              {#if previewAnswered}
                <EyeOff class="w-3.5 h-3.5" />Hide answered preview
              {:else}
                <Eye class="w-3.5 h-3.5" />Preview answered board
              {/if}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onclick={resetStyle} disabled={saving}>Reset style</Button>
        </div>
      </Card>
    </div>

    <div class="space-y-3 xl:sticky xl:top-5 xl:self-start">
      <div class="flex items-center justify-between">
        <span class="{caps} text-zinc-500">Preview</span>
      </div>
      <BingoBoard {board} answers={previewAnswers} />
      <p class="text-xs text-zinc-500">
        {previewAnswered && previewAnswers
          ? 'Green is Y, red is N, gray is a skipped bonus. The bands turn gray in this preview.'
          : 'Numbers are the board position, points are what the question is worth.'}
      </p>
    </div>
  </div>
</div>
