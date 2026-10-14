<script lang="ts">
  import { control } from '$lib/ui';
  import { Lock, X } from '@lucide/svelte';
  import type { Component } from 'svelte';

  /** One thing to pick: a role (with its color) or a channel (with an icon). */
  export interface ChipItem {
    id: string;
    name: string;
    /** A role's `#rrggbb`: the chip takes its tint and the list shows a dot. */
    color?: string;
    /** Marks an item that has no color (a channel, a thread, a forum). */
    icon?: Component<any>;
    /** Dimmed text beside the name in the list, e.g. "thread in #general". */
    hint?: string;
  }

  // Several choices at once, as chips in a box you can type in, with a search list under it. The one
  // base of RolePicker and ChannelsPicker. `max` caps how many can be chosen (a plan limit): once
  // reached, the box says so and the only thing left to do is remove a chip.
  interface Props {
    items: ChipItem[];
    selected: string[];
    onchange: (next: string[]) => void;
    /** Always selected and cannot be removed (e.g. roles that already grant the tier). */
    locked?: string[];
    lockedHint?: string;
    /** Not offered at all (neither listed nor suggested). */
    hidden?: string[];
    placeholder?: string;
    disabled?: boolean;
    max?: number;
    label?: string;
  }

  let { items, selected, onchange, locked = [], lockedHint = 'Always included', hidden = [], placeholder = 'Type to search...', disabled = false, max, label }: Props = $props();

  let query = $state('');
  let open = $state(false);
  let container: HTMLDivElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();

  const full = $derived(max !== undefined && selected.length >= max);
  const lockedItems = $derived(items.filter(i => locked.includes(i.id)));
  const selectedItems = $derived(
    selected.filter(id => !locked.includes(id) && !hidden.includes(id)).map(id => items.find(i => i.id === id)).filter((i): i is ChipItem => !!i),
  );
  const matches = $derived(
    items
      .filter(i => !selected.includes(i.id) && !locked.includes(i.id) && !hidden.includes(i.id) && `${i.name} ${i.hint ?? ''}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 50),
  );

  const tint = (item: ChipItem) => {
    if (!item.color) return { bg: 'rgb(var(--zinc-800))', text: 'rgb(var(--zinc-300))' };
    return item.color === '#000000' ? { bg: 'rgb(var(--zinc-800))', text: 'rgb(var(--zinc-400))' } : { bg: item.color + '20', text: item.color };
  };

  function add(id: string) {
    if (disabled || full) return;
    onchange([...selected, id]);
    query = '';
    if (max !== undefined && selected.length + 1 >= max) open = false;
    else input?.focus();
  }

  function remove(id: string) {
    if (!disabled) onchange(selected.filter(s => s !== id));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[0]) add(matches[0].id);
    } else if (e.key === 'Backspace' && query === '' && selectedItems.length) {
      remove(selectedItems[selectedItems.length - 1].id);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<svelte:window onclick={(e) => container && !container.contains(e.target as Node) && (open = false)} />

<div bind:this={container} class="relative">
  <div
    class="{control} flex flex-wrap items-center gap-1.5 px-2 py-1 {disabled ? 'opacity-50' : 'cursor-text'}"
    style="min-height: 2.25rem"
    role="presentation"
    onclick={() => { if (!disabled && !full) { open = true; input?.focus(); } }}
  >
    {#each lockedItems as item (item.id)}
      {@const c = tint(item)}
      <span class="inline-flex items-center gap-1 pl-2 pr-2 py-0.5 rounded-md text-xs font-medium" style="background:{c.bg};color:{c.text}" title={lockedHint}>
        <Lock class="w-3 h-3 opacity-70" />{item.name}
      </span>
    {/each}
    {#each selectedItems as item (item.id)}
      {@const c = tint(item)}
      <span class="inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-md text-xs font-medium" style="background:{c.bg};color:{c.text}">
        {#if item.icon}<item.icon class="w-3 h-3 shrink-0 opacity-70" />{/if}<span class="truncate">{item.name}</span>
        <button type="button" class="p-0.5 rounded hover:bg-black/20 cursor-pointer" onclick={() => remove(item.id)} aria-label="Remove {item.name}">
          <X class="w-3 h-3" />
        </button>
      </span>
    {/each}
    <!-- At the limit the search box goes away, so the box keeps the height of any other control. -->
    {#if !full}
      <input
        bind:this={input}
        bind:value={query}
        onfocus={() => (open = true)}
        onkeydown={onKey}
        {placeholder}
        aria-label={label}
        {disabled}
        class="flex-1 min-w-[5rem] bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
      />
    {/if}
  </div>
  {#if full}<p class="mt-1.5 text-xs text-zinc-500">Limit reached ({max}). Remove one to pick another.</p>{/if}

  {#if open && !disabled && !full}
    <div class="absolute top-full left-0 right-0 mt-1 z-40 max-h-56 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-lg shadow-black/30">
      {#each matches as item (item.id)}
        {@const c = tint(item)}
        <button type="button" class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/50 cursor-pointer" onclick={() => add(item.id)}>
          {#if item.color}
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{c.text}"></span>
          {:else if item.icon}
            <item.icon class="w-3.5 h-3.5 shrink-0 text-zinc-500" />
          {/if}
          <span class="truncate">{item.name}</span>
          {#if item.hint}<span class="ml-1 text-xs text-zinc-500 truncate">{item.hint}</span>{/if}
        </button>
      {:else}
        <p class="px-3 py-2.5 text-xs text-zinc-500">No match</p>
      {/each}
    </div>
  {/if}
</div>
