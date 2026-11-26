const UNITS = [
  { label: 'd', seconds: 24 * 60 * 60 },
  { label: 'h', seconds: 60 * 60 },
  { label: 'm', seconds: 60 },
  { label: 's', seconds: 1 },
] as const;

/** A number of seconds as people say it: 90 is `1m 30s`, 3700 is `1h 1m 40s`, 86400 is `1d`.
 *  Parts that are zero are left out. */
export function formatDuration(totalSeconds: number): string {
  let rest = Math.max(0, Math.floor(totalSeconds));
  if (rest === 0) return '0s';

  const parts: string[] = [];
  for (const unit of UNITS) {
    const count = Math.floor(rest / unit.seconds);
    if (count > 0) parts.push(`${count}${unit.label}`);
    rest -= count * unit.seconds;
  }
  return parts.join(' ');
}
