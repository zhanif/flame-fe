<script lang="ts">
  import { answersOf, BOARD_POSITIONS, choicesFor, QUESTION_COUNT } from '$lib/modules/bingo/board';
  import { Coins } from '@lucide/svelte';

  // The 12 correct answers of a round, in the board's own positions: 1-9 only Y or N, 10-11 may be skipped,
  // 12 cannot be N. Unset slots are kept as a space so the string stays aligned to its 12 positions.
  let {
    value = $bindable(''),
    disabled = false,
    points = [],
  }: { value?: string; disabled?: boolean; points?: number[] } = $props();

  const answers = $derived(answersOf(value));
  const complete = $derived(answers.every(answer => /[YN-]/.test(answer)));

  function pick(position: number, choice: string) {
    if (disabled) return;
    const chars = (value || '').padEnd(QUESTION_COUNT, ' ').slice(0, QUESTION_COUNT).split('');
    const index = position - 1;
    chars[index] = chars[index] === choice ? ' ' : choice;
    value = chars.join('');
  }
</script>

<div class="grid grid-cols-4 gap-2">
  {#each BOARD_POSITIONS as position (position)}
    {@const current = answers[position - 1]}
    <div class="rounded-xl bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800" class:opacity-60={!/[YN-]/.test(current)}>
      <div class="flex gap-1.5" role="group" aria-label="Question {position}">
        {#each choicesFor(position) as choice (choice)}
          <button
            type="button"
            {disabled}
            aria-pressed={current === choice}
            aria-label="Question {position}: {choice}"
            onclick={() => pick(position, choice)}
            class="{choicesFor(position).length === 2 ? 'aspect-square min-h-[4.5rem]' : 'h-[4.5rem]'} flex-1 cursor-pointer rounded-lg text-sm font-bold transition disabled:cursor-not-allowed {current === choice
              ? choice === 'Y'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : choice === 'N'
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}"
          >
            {choice}
          </button>
        {/each}
      </div>
      {#if points[position - 1] !== undefined}
        <div class="mt-1.5 flex items-center justify-between rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          <span>{position}</span>
          <span class="flex items-center gap-0.5"><Coins class="h-2.5 w-2.5" />{points[position - 1]}</span>
        </div>
      {/if}
    </div>
  {/each}
</div>

<p class="mt-3 text-xs {complete ? 'text-zinc-500' : 'text-amber-400'}">
  {complete ? 'All 12 answers are set. Saving rescores every entry of this round.' : `Pick ${answers.filter(answer => /[YN-]/.test(answer)).length} of ${QUESTION_COUNT} answers so far.`}
</p>
