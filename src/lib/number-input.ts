/** Keeps only what can be part of a whole number: digits. */
export const onlyDigits = (text: string): string => text.replace(/\D/g, '');

/** Keeps only what can be part of a decimal number: digits and one dot (a comma counts as the dot). */
export function onlyDecimal(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** An input handler that rewrites the box as the person types or pastes, so a letter never stays in it. */
export const restrictTo =
  (clean: (text: string) => string, set: (value: string) => void) =>
  (event: Event & { currentTarget: HTMLInputElement }) => {
    const box = event.currentTarget;
    const value = clean(box.value);
    if (value !== box.value) box.value = value;
    set(value);
  };
