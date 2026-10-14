/** Keeps only what can be part of a whole number: digits. */
export const onlyDigits = (text: string): string => text.replace(/\D/g, '');

/** Keeps only what can be part of a decimal number: digits and one dot (a comma counts as the dot). */
export function onlyDecimal(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** Keeps only what a slash command name can have: lowercase letters, digits, `-` and `_` (up to 32). */
export const onlyCommandName = (text: string): string => text.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);

/** Keeps only what a hex color is made of: a leading `#` and up to six hex digits, upper-cased. */
export const onlyHexColor = (text: string): string => `#${text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase()}`.replace(/^#$/, '');

/** An input handler that rewrites the box as the person types or pastes, so a letter never stays in it. */
export const restrictTo =
  (clean: (text: string) => string, set: (value: string) => void) =>
  (event: Event & { currentTarget: HTMLInputElement }) => {
    const box = event.currentTarget;
    const value = clean(box.value);
    if (value !== box.value) box.value = value;
    set(value);
  };
