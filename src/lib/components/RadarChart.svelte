<script lang="ts">
  import { toneText, type Tone } from '$lib/ui';

  // A small radar (spider) chart for comparing a few items over the same axes. Each value is scaled
  // against that axis's `max`, so very different ranges still read together. Drawn as plain SVG, colored
  // through the site's tone variables (`currentColor`), so it needs no dependency and follows light/dark.
  // Hovering the chart picks the nearest axis and follows the mouse with one panel listing every series,
  // so overlapping values both show.
  let {
    labels,
    max,
    series,
    size = 220,
    format = (value: number) => String(value),
  }: {
    labels: string[];
    /** The per-axis value the full radius stands for. */
    max: number[];
    series: { label: string; values: number[]; tone: Tone }[];
    size?: number;
    format?: (value: number, axis: number) => string;
  } = $props();

  const PAD = 30;
  const RINGS = [0.25, 0.5, 0.75, 1];
  const TOOLTIP_WIDTH = 150;
  const TWO_PI = Math.PI * 2;
  const center = $derived(size / 2);
  const radius = $derived(size / 2 - PAD);

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / labels.length;
  const vertex = (i: number, r: number) => [center + r * Math.cos(angle(i)), center + r * Math.sin(angle(i))] as const;
  const valueVertex = (values: number[], i: number) => vertex(i, radius * Math.min(values[i] / (max[i] || 1), 1));
  const ring = (scale: number) => labels.map((_, i) => vertex(i, radius * scale).join(',')).join(' ');
  const polygon = (values: number[]) => values.map((_, i) => valueVertex(values, i).join(',')).join(',');

  // Push a side label's text away from the chart, or center it above and below.
  const anchor = (i: number) => {
    const x = Math.cos(angle(i));
    if (Math.abs(x) < 0.2) return 'middle';
    return x > 0 ? 'start' : 'end';
  };

  let active = $state<number | null>(null);
  let cursor = $state({ x: 0, y: 0 });

  // The axis nearest to the pointer, so a hover anywhere shows the closest reading. Nothing near the
  // hub, where no axis is meaningfully closer.
  function axisAt(x: number, y: number): number | null {
    const dx = x - center;
    const dy = y - center;
    if (Math.hypot(dx, dy) < 8) return null;
    const pointer = Math.atan2(dy, dx);
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < labels.length; i++) {
      const raw = Math.abs(pointer - angle(i));
      const diff = Math.min(raw, TWO_PI - raw);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  function onMove(event: MouseEvent & { currentTarget: HTMLDivElement }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = size / (rect.width || size);
    cursor = { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
    active = axisAt(cursor.x, cursor.y);
  }

  // The panel trails the pointer, clamped so it never leaves the chart's width, and flips above or below
  // the pointer in the half where there is room.
  const tooltipLeft = $derived(Math.min(Math.max(cursor.x, TOOLTIP_WIDTH / 2 + 4), size - TOOLTIP_WIDTH / 2 - 4));
  const tooltipBelow = $derived(cursor.y <= center);
</script>

<div
  class="relative"
  style="width: {size}px; height: {size}px"
  onmousemove={onMove}
  onmouseleave={() => (active = null)}
  role="group"
  aria-label="Stat comparison chart"
>
  <svg viewBox="0 0 {size} {size}" width={size} height={size} style="overflow: visible">
    <g class="text-zinc-700">
      {#each RINGS as scale (scale)}
        <polygon points={ring(scale)} fill="none" stroke="currentColor" stroke-width="1" class="opacity-60" />
      {/each}
      {#each labels as _, i (i)}
        {@const end = vertex(i, radius)}
        <line x1={center} y1={center} x2={end[0]} y2={end[1]} stroke="currentColor" stroke-width="1" class="opacity-60" />
      {/each}
    </g>

    {#each series as s (s.label)}
      <polygon
        points={polygon(s.values)}
        class={toneText[s.tone]}
        fill="currentColor"
        fill-opacity="0.18"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {/each}

    <g class="text-zinc-400" fill="currentColor" font-size="9" font-weight="600">
      {#each labels as label, i (label)}
        {@const point = vertex(i, radius + 12)}
        {@const lines = label.split('\n')}
        {#each lines as line, li (li)}
          <text x={point[0]} y={point[1] + (li - (lines.length - 1) / 2) * 10} text-anchor={anchor(i)} dominant-baseline="middle"
            >{line}</text
          >
        {/each}
      {/each}
    </g>

    {#each labels as _, i (i)}
      {#each series as s (s.label)}
        {@const point = valueVertex(s.values, i)}
        <circle cx={point[0]} cy={point[1]} r="2.5" class={toneText[s.tone]} fill="currentColor" />
      {/each}
    {/each}
  </svg>

  {#if active !== null}
    <div
      class="pointer-events-none absolute z-10 rounded-lg bg-zinc-900/95 p-2 shadow-lg ring-1 ring-zinc-700"
      style="left: {tooltipLeft}px; top: {cursor.y}px; width: {TOOLTIP_WIDTH}px; transform: translate(-50%, {tooltipBelow
        ? '14px'
        : 'calc(-100% - 14px)'})"
    >
      <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{labels[active].replaceAll('\n', ' ')}</p>
      <div class="mt-1 space-y-0.5">
        {#each series as s (s.label)}
          <div class="flex items-center gap-1.5 text-xs">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current {toneText[s.tone]}"></span>
            <span class="min-w-0 flex-1 truncate text-zinc-400">{s.label}</span>
            <span class="shrink-0 tabular-nums text-zinc-100">{format(s.values[active], active)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
