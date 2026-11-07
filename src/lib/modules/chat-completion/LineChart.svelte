<script lang="ts">
  import { Chart, registerables } from 'chart.js';
  import { onMount, onDestroy } from 'svelte';

  Chart.register(...registerables);

  let { labels = [], data = [] }: { labels: string[]; data: number[] } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: '#f97316',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#71717a', maxTicksLimit: 8 }, grid: { color: 'rgba(63,63,70,0.4)' } },
          y: { beginAtZero: true, ticks: { color: '#71717a', precision: 0 }, grid: { color: 'rgba(63,63,70,0.4)' } },
        },
      },
    });
  });

  $effect(() => {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="h-32 w-full">
  <canvas bind:this={canvas}></canvas>
</div>
