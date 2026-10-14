<script lang="ts">
  // An on/off switch for a setting that applies right away.
  let { on, disabled = false, label, onclick }: { on: boolean; disabled?: boolean; label: string; onclick: () => void } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={on}
  aria-label={label}
  {disabled}
  {onclick}
  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:opacity-40 disabled:cursor-not-allowed {on
    ? 'bg-emerald-500/80 ring-emerald-500/50'
    : 'bg-zinc-800 ring-zinc-700 hover:ring-zinc-600'}"
>
  <span class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 {on ? 'translate-x-4' : 'translate-x-0'}"></span>
</button>
