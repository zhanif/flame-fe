<script lang="ts">
  import { LoaderCircle, Zap } from '@lucide/svelte';

  // A switch whose knob is a lightning bolt: the bolt fills and the track lights
  // up when the command is live. `danger` paints the "on" state red, for a
  // command that is registered but no longer owned by any installed module.
  let {
    on,
    busy = false,
    disabled = false,
    danger = false,
    label,
    onclick,
  }: { on: boolean; busy?: boolean; disabled?: boolean; danger?: boolean; label: string; onclick: () => void } = $props();

  const track = $derived(
    on
      ? danger
        ? 'bg-red-500/15 ring-red-500/40'
        : 'bg-emerald-500/15 ring-emerald-500/40'
      : 'bg-zinc-800 ring-zinc-700 hover:ring-zinc-600',
  );
  const knob = $derived(on ? (danger ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-zinc-700 text-zinc-400');
</script>

<button
  type="button"
  role="switch"
  aria-checked={on}
  aria-label={label}
  title={label}
  disabled={disabled || busy}
  {onclick}
  class="relative h-5 w-9 shrink-0 rounded-full ring-1 transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 disabled:cursor-not-allowed {disabled && !busy ? 'opacity-40' : ''} {track}"
>
  <span class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 ease-out {on ? 'translate-x-4' : 'translate-x-0'} {knob}">
    {#if busy}
      <LoaderCircle class="w-2.5 h-2.5 animate-spin" />
    {:else}
      <Zap class="w-2.5 h-2.5 {on ? 'fill-current' : ''}" />
    {/if}
  </span>
</button>
