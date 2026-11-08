import type { BingoBand, BingoBoard, BingoBoardStyle } from '$lib/api/endpoints';

/** The 12 cells in reading order: the fourth column holds questions 10-12. */
export const BOARD_POSITIONS = [1, 2, 3, 10, 4, 5, 6, 11, 7, 8, 9, 12];
export const MAIN_COUNT = 9;
export const QUESTION_COUNT = 12;

/** A style with the band objects copied, so editing one design never changes another. */
export const cloneStyle = (style: BingoBoardStyle): BingoBoardStyle => ({
  ...style,
  box: { ...style.box },
  bonus_1: { ...style.bonus_1 },
  bonus_2: { ...style.bonus_2 },
  bonus_3: { ...style.bonus_3 },
});

export const cloneBoard = (board: BingoBoard): BingoBoard => ({
  ...board,
  questions: [...board.questions],
  points: [...board.points],
  style: cloneStyle(board.style),
});

export const sameBoard = (a: BingoBoard, b: BingoBoard) => JSON.stringify(a) === JSON.stringify(b);

/** The questions still empty, by position. */
export const missingQuestions = (board: BingoBoard): number[] =>
  board.questions
    .map((question, index) => (question.trim() ? null : index + 1))
    .filter((position): position is number => position !== null);

/** What a position accepts: the nine main ones only Y or N, the last one not N. */
export const choicesFor = (position: number): string[] =>
  position <= MAIN_COUNT ? ['Y', 'N'] : position === QUESTION_COUNT ? ['Y', '-'] : ['Y', 'N', '-'];

export const answersOf = (value: string): string[] => Array.from({ length: QUESTION_COUNT }, (_, index) => value[index] ?? ' ');

export const answerString = (answers: string[]): string => answers.join('');

/** The band under a cell: the box band on the main grid, one per bonus cell otherwise (10, 11, 12). */
export const cellBand = (style: BingoBoardStyle, position: number): BingoBand =>
  position <= MAIN_COUNT ? style.box : ([style.bonus_1, style.bonus_2, style.bonus_3][position - 10] ?? style.bonus_3);

/** A cell's width in the card's coordinates: the three main cells share what the bonus column leaves. */
export const cellWidth = (position: number): number =>
  position > MAIN_COUNT ? CARD.bonusWidth : (CARD.width - CARD.padding * 2 - CARD.bonusWidth - CARD.gap * 3) / 3;

/** The card in the 1000px-wide coordinates the PNG is drawn in. The preview says the same numbers in container
 *  units (1cqw = 10px), so a design looks the same in the designer, in the export and in Discord. */
export const CARD = {
  width: 1000,
  padding: 30,
  header: 130,
  footer: 90,
  rowHeight: 250,
  gap: 14,
  bonusWidth: 220,
  strip: 62,
  chip: 34,
  title: 36,
  subtitle: 20,
  text: 24,
  figure: 22,
  lineHeight: 33,
  footerText: 22,
  gutter: 12,
  inset: 8,
  lines: 4,
} as const;

/** The `--points` line of a cell, split the way the strip shows it: the position on one side, the points on the other. */
export const cellFigure = (board: BingoBoard, position: number) => ({
  position: board.style.show_numbers ? String(position) : '',
  points: board.style.show_points ? String(board.points[position - 1] ?? 0) : '',
});
