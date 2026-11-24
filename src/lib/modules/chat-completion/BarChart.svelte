<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte';
  import { Chart, registerables } from 'chart.js';
  import { onMount, onDestroy } from 'svelte';

  Chart.register(...registerables);

  let { labels = [], data = [] }: { labels: string[]; data: number[] } = $props();

  /** A theme variable as a canvas color: `--vermilion-400` ("255 99 56") becomes `rgb(255, 99, 56)`.
   *  Canvas needs literal colors, so the bars and axes read the theme's variables instead of a fixed hex. */
  function color(name: string, fallback: string, alpha = 1): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    const [r, g, b] = value.split(/\s+/);
    return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const accent = () => color('--vermilion-400', '255 99 56');
  const tick = () => color('--zinc-500', '135 137 145');
  const grid = () => color('--zinc-700', '63 63 70', 0.4);

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: accent(), borderRadius: 3, maxBarThickness: 24 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: tick(), maxTicksLimit: 8 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: tick(), precision: 0 }, grid: { color: grid() } },
        },
      },
    });
  });

  // The range selector swaps the points; a theme toggle repaints the axes. Both land here.
  $effect(() => {
    void theme.current;
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = accent();
    const scales = chart.options.scales as Record<string, { ticks?: { color?: string }; grid?: { color?: string } }>;
    scales.x.ticks = { ...scales.x.ticks, color: tick() };
    scales.y.ticks = { ...scales.y.ticks, color: tick() };
    scales.y.grid = { ...scales.y.grid, color: grid() };
    chart.update();
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="h-40 w-full">
  <canvas bind:this={canvas}></canvas>
</div>
