<script lang="ts">
  import { control } from '$lib/ui';
  import { Check, ChevronDown } from '@lucide/svelte';

  interface Option {
    value: string;
    label: string;
    /** Secondary text shown dimmed beside the label. */
    hint?: string;
    /** Extra text matched by the search box (not displayed). */
    keywords?: string;
  }

  let {
    value = $bindable(''),
    options,
    placeholder = 'Search...',
    label,
    disabled = false,
    id,
    class: className = '',
  }: { value?: string; options: Option[]; placeholder?: string; label?: string; disabled?: boolean; id?: string; class?: string } = $props();

  let query = $state('');
  let open = $state(false);
  let active = $state(0);
  let container: HTMLDivElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let list: HTMLDivElement | undefined = $state();

  const selected = $derived(options.find(o => o.value === value));
  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => `${o.label} ${o.hint ?? ''} ${o.keywords ?? ''}`.toLowerCase().includes(q));
  });

  function show() {
    if (disabled) return;
    open = true;
    query = '';
    active = Math.max(0, options.findIndex(o => o.value === value));
    queueMicrotask(() => list?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' }));
  }

  function pick(option: Option) {
    value = option.value;
    open = false;
    query = '';
    input?.blur();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      active = Math.min(Math.max(active + (e.key === 'ArrowDown' ? 1 : -1), 0), matches.length - 1);
      queueMicrotask(() => list?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[active]) pick(matches[active]);
    } else if (e.key === 'Escape') {
      open = false;
      query = '';
    }
  }
</script>

<svelte:window onclick={(e) => container && !container.contains(e.target as Node) && ((open = false), (query = ''))} />

<div bind:this={container} class="relative {className}">
  <div class="relative">
    <input
      bind:this={input}
      {id}
      bind:value={() => (open ? query : (selected ? `${selected.label}${selected.hint ? ` · ${selected.hint}` : ''}` : value)), v => { query = v; active = 0; }}
      onfocus={show}
      onclick={() => !open && show()}
      onkeydown={onKey}
      {disabled}
      aria-label={label}
      role="combobox"
      aria-expanded={open}
      aria-controls="{id}-list"
      autocomplete="off"
      placeholder={open ? placeholder : ''}
      class="{control} w-full h-9 pl-3 pr-9 text-sm truncate {disabled ? '' : 'cursor-pointer'}"
    />
    <ChevronDown class="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition {open ? 'rotate-180' : ''}" />
  </div>

  {#if open && !disabled}
    <div
      bind:this={list}
      id="{id}-list"
      role="listbox"
      class="absolute top-full left-0 right-0 mt-1.5 z-40 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-lg shadow-black/30"
    >
      {#each matches as option, i (option.value)}
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          data-active={i === active}
          onmouseenter={() => (active = i)}
          onclick={() => pick(option)}
          class="w-full flex items-center justify-between gap-3 min-h-8 px-2.5 py-1.5 rounded-lg text-left text-sm cursor-pointer {i === active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'}"
        >
          <span class="truncate"><span class="font-medium">{option.label}</span>{#if option.hint}<span class="ml-2 text-zinc-500">{option.hint}</span>{/if}</span>
          {#if option.value === value}<Check class="w-3.5 h-3.5 shrink-0 text-orange-400" />{/if}
        </button>
      {:else}
        <p class="px-3 py-2.5 text-xs text-zinc-500">No matches</p>
      {/each}
    </div>
  {/if}
</div>
