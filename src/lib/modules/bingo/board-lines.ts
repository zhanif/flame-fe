import { CARD } from '$lib/modules/bingo/board';

const FONT = `600 ${CARD.text}px "Poppins", "Segoe UI", "Noto Sans", "DejaVu Sans", sans-serif`;

/** A line wider than this share of the cell is split into one more line when there is room for it, so two very
 *  long lines ("Code runs away / from the hideout") become three narrower ones instead of nearly filling the cell. */
const FILL = 0.66;

/** Breaks a question into the lines the card draws. The lines are balanced: the text is wrapped at the cell's
 *  width, then the wrap is retried at the narrowest width that still fits the same number of lines. That turns
 *  "Uzuhiko is being / used" into "Uzuhiko is / being used" instead of leaving a short last line. When the balanced
 *  lines are still too wide and there are lines to spare, one more is added and balanced again. */
class BoardLines {
  private context: CanvasRenderingContext2D | null = null;

  lines(question: string, width: number): string[] {
    const words = question.split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const count = this.layout(words, width).length;
    let broken = this.balanced(words, count, width);

    // Only a two-line question gets a third line: three already reads as short lines, and four would crowd the cell.
    if (count === 2 && this.widest(broken) > width * FILL) {
      const next = this.balanced(words, 3, width);
      if (next.length > count) broken = next;
    }

    if (broken.length <= CARD.lines) return broken;
    const kept = broken.slice(0, CARD.lines);
    let last = kept[CARD.lines - 1];
    while (last && this.measure(`${last}…`) > width) last = last.slice(0, -1);
    kept[CARD.lines - 1] = `${last.trimEnd()}…`;
    return kept;
  }

  /** The layout at the narrowest width that still fits within `count` lines. */
  private balanced(words: string[], count: number, width: number): string[] {
    let low = Math.max(...words.map(word => this.measure(word)));
    let high = width;
    for (let step = 0; step < 16 && high - low > 0.5; step++) {
      const middle = (low + high) / 2;
      if (this.layout(words, middle).length <= count) high = middle;
      else low = middle;
    }
    return this.layout(words, high);
  }

  private widest(lines: string[]): number {
    return Math.max(...lines.map(line => this.measure(line)));
  }

  private layout(words: string[], width: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && this.measure(candidate) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private measure(text: string): number {
    if (!this.context) {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) throw new Error('The browser cannot measure the text');
      context.font = FONT;
      this.context = context;
    }
    return this.context.measureText(text).width;
  }
}

export const boardLines = new BoardLines();
