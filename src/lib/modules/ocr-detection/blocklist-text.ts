import type { OcrTerm } from '$lib/api/endpoints';

export interface TermLine {
  term: string;
  is_regex: boolean;
}

/** The blocklist as text, one term per line. A regular expression is written between slashes
 *  (`/\bass\b/`); every other line is a plain word. */
export function formatTerms(terms: OcrTerm[]): string {
  return terms.map(t => (t.is_regex ? `/${t.term}/` : t.term)).join('\n');
}

/** The other way round. Blank lines are skipped and a term written twice counts once. */
export function parseTerms(text: string): TermLine[] {
  const seen = new Set<string>();
  const lines: TermLine[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const is_regex = line.length > 2 && line.startsWith('/') && line.endsWith('/');
    const term = is_regex ? line.slice(1, -1) : line;
    if (seen.has(term)) continue;

    seen.add(term);
    lines.push({ term, is_regex });
  }
  return lines;
}

/** What is wrong with the list, in words, or null: a regular expression that does not compile, a term that is too long. */
export function termsProblem(text: string, maxTerms: number, maxLength = 100): string | null {
  const rows = text.split('\n');
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].trim();
    if (!line) continue;

    const parsed = parseTerms(line)[0];
    if (parsed.term.length > maxLength) return `Line ${i + 1} is longer than ${maxLength} characters`;
    if (parsed.is_regex) {
      try {
        new RegExp(parsed.term, 'i');
      } catch {
        return `Line ${i + 1} is not a valid regular expression`;
      }
    }
  }
  const count = parseTerms(text).length;
  return count > maxTerms ? `At most ${maxTerms} terms (this list has ${count})` : null;
}
