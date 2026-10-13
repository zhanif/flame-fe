export interface TimezoneOption {
  value: string;
  label: string;
  hint: string;
  keywords: string;
  offsetMinutes: number;
}

function offsetMinutes(zone: string, at: Date): number {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC ${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Every IANA zone the runtime knows, ordered west to east, labeled "UTC +7 · Asia/Jakarta". */
export function timezoneOptions(now = new Date()): TimezoneOption[] {
  const zones = new Set(['UTC', ...Intl.supportedValuesOf('timeZone')]);
  return [...zones]
    .map(zone => {
      const minutes = offsetMinutes(zone, now);
      const label = formatOffset(minutes);
      const hint = zone === 'UTC' ? 'Greenwich Mean Time' : zone;
      return { value: zone, label, hint, keywords: `${zone} ${zone.replaceAll('_', ' ')} gmt`, offsetMinutes: minutes };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || (a.value === 'UTC' ? -1 : b.value === 'UTC' ? 1 : a.value.localeCompare(b.value)));
}

export function timeIn(zone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now);
  } catch {
    return '';
  }
}
