<script lang="ts">
  import { control } from '$lib/ui';
  import { Check, ChevronDown } from '@lucide/svelte';
  import type { Component } from 'svelte';

  interface Option {
    value: string;
    label: string;
    /** Secondary text shown dimmed beside the label. */
    hint?: string;
    /** Extra text matched by the search box (not displayed). */
    keywords?: string;
    /** A role's color: shown as a dot before the label in the list. */
    color?: string;
    /** Listed but not pickable; `hint` says why. */
    disabled?: boolean;
    /** An icon before the label (a channel's kind, say). */
    icon?: Component<any>;
    /** A group-like entry (a category): small caps in a muted tone, still pickable. */
    heading?: boolean;
    /** The full explanation, as a tooltip, when `hint` is the short form. */
    tooltip?: string;
    /** A small icon after a disabled option's label (a lock, a link) saying why it is out of reach. */
    badge?: Component<any>;
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
    if (option.disabled) return;
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

<svelte:window onpointerdown={(e) => container && !container.contains(e.target as Node) && ((open = false), (query = ""))} />

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
      class="{control} w-full h-9 {selected?.icon && !open ? 'pl-9' : 'pl-3'} pr-9 text-sm truncate {disabled ? '' : 'cursor-pointer'}"
    />
    {#if selected?.icon && !open}<selected.icon class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />{/if}
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
          aria-disabled={option.disabled}
          title={option.tooltip}
          class="w-full flex items-center justify-between gap-3 min-h-8 px-2.5 py-1.5 rounded-lg text-left text-sm {option.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} {i === active && !option.disabled ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'}"
        >
          <span class="flex items-center gap-2 truncate">{#if option.icon}<option.icon class="h-3.5 w-3.5 shrink-0 {option.heading ? 'text-zinc-500' : 'text-zinc-400'}" />{/if}{#if option.color}<span class="w-2.5 h-2.5 shrink-0 rounded-full" style="background:{option.color === '#000000' ? 'rgb(var(--zinc-500))' : option.color}"></span>{/if}<span
            class={option.heading ? 'text-[11px] font-semibold uppercase tracking-wider text-zinc-400' : 'font-medium'}
            style={option.disabled && option.color && option.color !== '#000000' ? `color:${option.color}` : undefined}>{option.label}</span
          >{#if option.disabled && option.badge}<option.badge class="h-3 w-3 shrink-0 text-zinc-500" />{/if}{#if option.hint}<span class="ml-1 text-zinc-500">{option.hint}</span>{/if}</span>
          {#if option.value === value}<Check class="w-3.5 h-3.5 shrink-0 text-orange-400" />{/if}
        </button>
      {:else}
        <p class="px-3 py-2.5 text-xs text-zinc-500">No matches</p>
      {/each}
    </div>
  {/if}
</div>
