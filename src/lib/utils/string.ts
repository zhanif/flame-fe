/** Capitalises the first letter of every word, leaving the rest as typed. Used to show stored
 *  names (elements, effects) in Title Case without changing what the guild typed. */
export function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}
