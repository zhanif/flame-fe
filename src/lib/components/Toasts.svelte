<script lang="ts">
  import { dismiss, pause, resume, TOAST_MS, toasts } from '$lib/stores/toast.svelte';
  import { CircleAlert, CircleCheck, Info, X } from '@lucide/svelte';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';

  const STYLE = {
    success: { icon: CircleCheck, tint: 'text-emerald-400', bar: 'bg-emerald-500' },
    error: { icon: CircleAlert, tint: 'text-red-400', bar: 'bg-red-500' },
    info: { icon: Info, tint: 'text-orange-400', bar: 'bg-orange-500' },
  } as const;
</script>

<div class="fixed bottom-5 right-5 z-[60] flex flex-col gap-3 w-[360px] max-w-[calc(100vw-2.5rem)]" aria-live="polite">
  {#each toasts.list as t (t.id)}
    {@const s = STYLE[t.kind]}
    <div
      role={t.kind === 'error' ? 'alert' : 'status'}
      class="toast relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-lg shadow-black/25"
      onmouseenter={() => pause(t.id)}
      onmouseleave={() => resume(t.id)}
      in:fly={{ x: 40, duration: 280, easing: cubicOut }}
      out:fade={{ duration: 160 }}
      animate:flip={{ duration: 220 }}
    >
      <s.icon class="w-5 h-5 shrink-0 mt-px {s.tint}" />
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="text-sm font-semibold text-zinc-100">{t.title}</p>
        {#if t.description}<p class="text-xs text-zinc-400 mt-0.5 leading-relaxed">{t.description}</p>{/if}
      </div>
      <button
        onclick={() => dismiss(t.id)}
        aria-label="Dismiss"
        class="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 cursor-pointer transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
      <div
        class="toast-bar absolute bottom-0 left-0 h-0.5 w-full origin-left {s.bar}"
        style="animation: toast-progress {TOAST_MS}ms linear forwards"
        aria-hidden="true"
      ></div>
    </div>
  {/each}
</div>
