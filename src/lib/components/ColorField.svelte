<script lang="ts">
  import { caps, control } from '$lib/ui';
  import { onlyHexColor, restrictTo } from '$lib/number-input';
  import { Plus, X } from '@lucide/svelte';

  // One color to pick, kept compact: a swatch that opens the system color picker, a hex box for exact values
  // and a row of common role colors. `value` is `#RRGGBB`, or '' for none. An `optional` color can be removed
  // and added back.
  let {
    value = $bindable(''),
    label,
    optional = false,
    disabled = false,
  }: { value?: string; label: string; optional?: boolean; disabled?: boolean } = $props();

  const PRESETS = ['#1ABC9C', '#2ECC71', '#3498DB', '#9B59B6', '#E91E63', '#F1C40F', '#E67E22', '#E74C3C', '#95A5A6', '#607D8B', '#11806A', '#1F8B4C', '#206694', '#71368A'];
  const FULL = /^#[0-9A-F]{6}$/;
  const valid = $derived(FULL.test(value));
</script>

<div class="min-w-0">
  <div class="mb-1.5 flex items-center justify-between gap-2">
    <span class="{caps} text-zinc-400">{label}</span>
    {#if optional && value !== ''}
      <button type="button" class="cursor-pointer text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed" aria-label="Remove {label}" title="Remove" {disabled} onclick={() => (value = '')}>
        <X class="h-3.5 w-3.5" />
      </button>
    {/if}
  </div>

  {#if optional && value === ''}
    <button
      type="button"
      {disabled}
      onclick={() => (value = PRESETS[0])}
      class="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 transition hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus class="h-3.5 w-3.5" />Add a color
    </button>
  {:else}
    <div class="flex items-center gap-2">
      <label
        class="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-zinc-600/60 {disabled ? 'opacity-60' : 'cursor-pointer hover:ring-zinc-400'} transition"
        style="background:{valid ? value : 'rgb(var(--zinc-800))'}"
        title="Pick a color"
      >
        <input
          type="color"
          {disabled}
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={valid ? value.toLowerCase() : '#5865f2'}
          oninput={e => (value = e.currentTarget.value.toUpperCase())}
          aria-label="{label} picker"
        />
      </label>
      <input
        type="text"
        {disabled}
        bind:value
        maxlength="7"
        placeholder="#FF8800"
        oninput={restrictTo(onlyHexColor, v => (value = v))}
        aria-label="{label} hex"
        class="{control} h-9 min-w-0 flex-1 px-3 font-mono text-sm"
      />
    </div>
    <div class="mt-2 flex flex-wrap gap-1" role="group" aria-label="Common colors">
      {#each PRESETS as preset (preset)}
        <button
          type="button"
          {disabled}
          title={preset}
          aria-label={preset}
          onclick={() => (value = preset)}
          class="h-4 w-4 cursor-pointer rounded-full ring-1 transition hover:scale-110 disabled:cursor-not-allowed {value === preset ? 'ring-2 ring-zinc-100' : 'ring-zinc-700'}"
          style="background:{preset}"
        ></button>
      {/each}
    </div>
  {/if}
</div>
