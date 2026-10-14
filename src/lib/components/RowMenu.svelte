<script lang="ts">
  import { EllipsisVertical } from '@lucide/svelte';
  import { DropdownMenu } from 'bits-ui';
  import type { Component } from 'svelte';

  export interface RowMenuItem {
    label: string;
    icon?: Component<any>;
    onclick: () => void;
    /** Red, for what removes something. */
    danger?: boolean;
    disabled?: boolean;
    /** Shown as a tooltip, e.g. why an item is disabled. */
    hint?: string;
  }

  // The actions of one table row or card behind a vertical three-dot button, when there are three or more.
  // One or two actions stay as plain icon buttons.
  let { items, label = 'Actions' }: { items: RowMenuItem[]; label?: string } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    aria-label={label}
    title={label}
    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 outline-none transition duration-150 cursor-pointer hover:bg-zinc-800/60 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-orange-500/50 data-[state=open]:bg-zinc-800/60 data-[state=open]:text-zinc-100"
  >
    <EllipsisVertical class="h-4 w-4" />
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      align="end"
      sideOffset={6}
      class="pop z-50 min-w-44 rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-lg shadow-black/30 outline-none"
    >
      {#each items as item (item.label)}
        <DropdownMenu.Item
          disabled={item.disabled}
          onSelect={item.onclick}
          title={item.hint}
          class="menu-item flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 {item.danger ? 'text-red-400' : 'text-zinc-300'}"
        >
          {#if item.icon}<item.icon class="h-3.5 w-3.5 shrink-0" />{/if}
          <span class="truncate">{item.label}</span>
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
