import type { BingoBoard } from '$lib/api/endpoints';
import { BOARD_POSITIONS, CARD, cellBand, cellFigure } from '$lib/modules/bingo/board';
import { boardLines } from '$lib/modules/bingo/board-lines';

const FONT = '"Poppins", "Segoe UI", "Noto Sans", "DejaVu Sans", sans-serif';

/** Draws the board exactly as the Discord card and the dashboard preview show it, then downloads it as a PNG. */
class BoardExporter {
  async download(board: BingoBoard, answers?: string): Promise<void> {
    await this.loadFont();
    const canvas = this.draw(board, answers);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The image could not be made');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = answers ? 'answered-board' : 'board';
    link.download = `${(board.title.trim() || 'bingo').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'bingo'}-${suffix}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private draw(board: BingoBoard, answers?: string): HTMLCanvasElement {
    const height = CARD.header + CARD.rowHeight * 3 + CARD.gap * 2 + CARD.footer;
    const canvas = document.createElement('canvas');
    canvas.width = CARD.width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The browser cannot draw the board');

    ctx.fillStyle = board.style.background;
    ctx.fillRect(0, 0, CARD.width, height);

    this.drawHeader(ctx, board);

    const content = CARD.width - CARD.padding * 2;
    const mainWidth = content - CARD.bonusWidth - CARD.gap;
    const cellWidth = (mainWidth - CARD.gap * 2) / 3;

    BOARD_POSITIONS.forEach((position, index) => {
      const row = Math.floor(index / 4);
      const column = index % 4;
      const x = column === 3 ? CARD.padding + mainWidth + CARD.gap : CARD.padding + column * (cellWidth + CARD.gap);
      const width = column === 3 ? CARD.bonusWidth : cellWidth;
      const y = CARD.header + row * (CARD.rowHeight + CARD.gap);
      this.drawCell(ctx, board, position, x, y, width, answers);
    });

    if (board.footer) {
      ctx.fillStyle = board.style.subtitle_color;
      ctx.font = `${CARD.footerText}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(board.footer, CARD.width - CARD.padding, height - CARD.footer / 2);
    }

    return canvas;
  }

  private drawHeader(ctx: CanvasRenderingContext2D, board: BingoBoard): void {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = board.style.title_color;
    ctx.font = `bold ${CARD.title}px ${FONT}`;
    ctx.fillText(board.title || 'Bingo', CARD.padding, board.subtitle ? 52 : CARD.header / 2);

    if (board.subtitle) {
      ctx.fillStyle = board.style.subtitle_color;
      ctx.font = `${CARD.subtitle}px ${FONT}`;
      ctx.fillText(board.subtitle, CARD.padding, 98);
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    board: BingoBoard,
    position: number,
    x: number,
    y: number,
    width: number,
    answers?: string,
  ): void {
    const figure = cellFigure(board, position);
    const band = cellBand(board.style, position);
    const hasStrip = Boolean(figure.position || figure.points);
    const answer = answers?.[position - 1];
    const tone =
      answer && answer !== ' '
        ? ({
            Y: { tile: '#5ee6ad', band: { color: '#52525b', text: '#fafafa' } },
            N: { tile: '#fa7d90', band: { color: '#52525b', text: '#fafafa' } },
            '-': { tile: '#8b8b92', band: { color: '#52525b', text: '#fafafa' } },
          }[answer] ?? null)
        : null;
    const tileColor = tone ? tone.tile : board.style.tile;
    const bandColor = tone ? tone.band.color : band.color;
    const bandText = tone ? tone.band.text : band.text;

    this.roundedRect(ctx, x, y, width, CARD.rowHeight, board.style.radius);
    ctx.fillStyle = tileColor;
    ctx.fill();

    if (hasStrip) {
      ctx.save();
      this.roundedRect(ctx, x, y, width, CARD.rowHeight, board.style.radius);
      ctx.clip();
      ctx.fillStyle = bandColor;
      ctx.fillRect(x, y + CARD.rowHeight - CARD.strip, width, CARD.strip);
      ctx.restore();
    }

    const question = board.questions[position - 1]?.trim() || '';
    const lines = boardLines.lines(question, width - CARD.gutter * 2);
    const top = y + CARD.inset;
    const bottom = y + CARD.rowHeight - (hasStrip ? CARD.strip : CARD.inset);
    const start = top + (bottom - top - lines.length * CARD.lineHeight) / 2 + CARD.lineHeight / 2;
    ctx.fillStyle = board.style.text;
    ctx.font = `600 ${CARD.text}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => ctx.fillText(line, x + width / 2, start + index * CARD.lineHeight));

    if (!hasStrip) return;
    ctx.fillStyle = bandText;
    ctx.textBaseline = 'middle';
    const baseline = y + CARD.rowHeight - CARD.strip / 2;
    if (figure.position) {
      const chipX = x + 18;
      const chipY = baseline - CARD.chip / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      this.roundedRect(ctx, chipX, chipY, CARD.chip, CARD.chip, 10);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = bandText;
      ctx.font = `600 17px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(figure.position, chipX + CARD.chip / 2, baseline);
    }
    if (figure.points) {
      ctx.fillStyle = bandText;
      ctx.font = `600 ${CARD.figure}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(figure.points, x + width - 18, baseline);
    }
  }

  private async loadFont(): Promise<void> {
    if (!document.fonts) return;
    await Promise.allSettled([
      document.fonts.load('600 24px Poppins'),
      document.fonts.load('bold 22px Poppins'),
      document.fonts.load('bold 36px Poppins'),
    ]);
    await document.fonts.ready;
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export const boardExporter = new BoardExporter();
