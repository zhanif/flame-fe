<script lang="ts">
  import { control } from '$lib/ui';
  import { Check, ChevronDown } from '@lucide/svelte';
  import { Select } from 'bits-ui';

  // A styled dropdown (bits-ui handles keyboard, focus and positioning). The first
  // entry is the empty choice ("All actions"), which clears the filter.
  const ALL = '__all__';

  let {
    value = $bindable(''),
    options,
    placeholder,
    label,
    disabled = false,
    onchange,
    class: className = '',
  }: {
    value?: string;
    options: { value: string; label: string }[];
    placeholder: string;
    label: string;
    disabled?: boolean;
    onchange?: () => void;
    class?: string;
  } = $props();

  const items = $derived([{ value: ALL, label: placeholder }, ...options]);
  const shown = $derived(options.find(o => o.value === value)?.label ?? placeholder);
</script>

<Select.Root
  type="single"
  {items}
  {disabled}
  bind:value={() => value || ALL,
  v => {
    value = v === ALL ? '' : v;
    onchange?.();
  }}
>
  <Select.Trigger
    aria-label={label}
    title={label}
    class="{control} h-9 px-3 text-sm flex items-center justify-between gap-2 cursor-pointer data-[disabled]:opacity-50 {className}"
  >
    <span class="truncate {value ? 'text-zinc-100' : 'text-zinc-400'}">{shown}</span>
    <ChevronDown class="w-4 h-4 shrink-0 text-zinc-500" />
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      sideOffset={6}
      class="pop z-50 min-w-[var(--bits-select-anchor-width)] max-h-72 overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-lg shadow-black/30 outline-none"
    >
      <Select.Viewport>
        {#each items as item (item.value)}
          <Select.Item
            value={item.value}
            label={item.label}
            class="menu-item flex items-center justify-between gap-3 h-8 px-2.5 rounded-lg text-sm text-zinc-300 cursor-pointer outline-none"
          >
            {#snippet children({ selected })}
              <span class="truncate">{item.label}</span>
              {#if selected}<Check class="w-3.5 h-3.5 shrink-0" />{/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
