<script lang="ts">
  import type { BingoBoard } from '$lib/api/endpoints';
  import { BOARD_POSITIONS, CARD, cellBand, cellFigure, cellWidth, QUESTION_COUNT } from '$lib/modules/bingo/board';
  import { boardLines } from '$lib/modules/bingo/board-lines';
  import { onMount } from 'svelte';

  /** The answered preview: light green for Y, light red for N, light gray for a skip, and a gray band.
   *  The question text keeps the design's own color and weight. */
  const ANSWER_TONES: Record<string, { tile: string; band: { color: string; text: string } }> = {
    Y: { tile: '#5ee6ad', band: { color: '#52525b', text: '#fafafa' } },
    N: { tile: '#fa7d90', band: { color: '#52525b', text: '#fafafa' } },
    '-': { tile: '#8b8b92', band: { color: '#52525b', text: '#fafafa' } },
  };

  // The board as the round's card shows it: the same tokens, the same 4x3 layout, drawn by the browser instead
  // of the canvas, so the designer preview matches what Discord gets. Every size is the PNG's 1000px geometry
  // in container units (1cqw = 10px of the card), so the preview scales instead of drifting.
  let { board, answers = null, class: className = '' }: { board: BingoBoard; answers?: string | null; class?: string } = $props();

  const cq = (px: number) => `${px / 10}cqw`;
  const radius = $derived(cq(board.style.radius));
  const answered = $derived(answers !== null && answers !== undefined);
  const answerChars = $derived(Array.from({ length: QUESTION_COUNT }, (_, index) => (answers ?? '')[index] ?? ' '));
  const toneAt = (position: number) => (answered ? (ANSWER_TONES[answerChars[position - 1]] ?? null) : null);

  // The questions are measured once the font is in: before that the lines would break at the fallback font's widths.
  let fontsReady = $state(false);
  onMount(() => {
    document.fonts?.ready.then(() => (fontsReady = true));
  });

  const lines = $derived.by(() => {
    void fontsReady;
    return BOARD_POSITIONS.map(position =>
      boardLines.lines(board.questions[position - 1]?.trim() || 'Empty question', cellWidth(position) - CARD.gutter * 2),
    );
  });
</script>

<div
  class="w-full overflow-hidden {className}"
  style="container-type:inline-size;background:{board.style.background};font-family:'Poppins',sans-serif;color:{board.style.title_color}"
>
  <div class="relative" style="height:{cq(CARD.header)};margin:0 {cq(CARD.padding)}">
    <p
      class="absolute left-0 max-w-full truncate font-bold"
      style="top:{board.subtitle ? cq(52) : cq(CARD.header / 2)};transform:translateY(-50%);font-size:{cq(
        CARD.title,
      )};line-height:1.4;color:{board.style.title_color}"
    >
      {board.title || 'Bingo'}
    </p>
    {#if board.subtitle}
      <p
        class="absolute left-0 max-w-full truncate"
        style="top:{cq(98)};transform:translateY(-50%);font-size:{cq(CARD.subtitle)};line-height:1.4;color:{board.style.subtitle_color}"
      >
        {board.subtitle}
      </p>
    {/if}
  </div>

  <div
    class="grid"
    style="margin:0 {cq(CARD.padding)};grid-template-columns:repeat(3,minmax(0,1fr)) {cq(CARD.bonusWidth)};grid-auto-rows:{cq(
      CARD.rowHeight,
    )};gap:{cq(CARD.gap)}"
  >
    {#each BOARD_POSITIONS as position, index (position)}
      {@const figure = cellFigure(board, position)}
      {@const tone = toneAt(position)}
      {@const band = tone ? tone.band : cellBand(board.style, position)}
      <div class="relative overflow-hidden" style="background:{tone ? tone.tile : board.style.tile};border-radius:{radius}">
        <div
          class="absolute flex items-center justify-center"
          style="left:{cq(CARD.gutter)};right:{cq(CARD.gutter)};top:{cq(CARD.inset)};bottom:{cq(
            figure.position || figure.points ? CARD.strip : CARD.inset,
          )}"
        >
          <p
            class="w-full text-center font-semibold"
            style="font-size:{cq(CARD.text)};line-height:{CARD.lineHeight / CARD.text};color:{board.style.text}"
          >
            {#each lines[index] as line, lineIndex (lineIndex)}
              <span class="block">{line}</span>
            {/each}
          </p>
        </div>
        {#if figure.position || figure.points}
          <div
            class="absolute inset-x-0 bottom-0 flex items-center gap-2 font-bold"
            style="height:{cq(CARD.strip)};padding:0 {cq(18)};background:{band.color};color:{band.text}"
          >
            {#if figure.position}
              <span
                class="inline-flex items-center justify-center rounded-md font-semibold"
                style="min-width:{cq(CARD.chip)};height:{cq(CARD.chip)};padding:0 {cq(7)};background:rgba(0, 0, 0, 0.18);font-size:{cq(
                  17,
                )};font-variant-numeric:tabular-nums">{figure.position}</span
              >
            {/if}
            <span class="ml-auto font-semibold" style="font-size:{cq(CARD.figure)};letter-spacing:0.01em;font-variant-numeric:tabular-nums"
              >{figure.points}</span
            >
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div
    class="flex items-center justify-end"
    style="height:{cq(CARD.footer)};padding:0 {cq(CARD.padding)};font-size:{cq(CARD.footerText)};color:{board.style.subtitle_color}"
  >
    {board.footer}
  </div>
</div>
