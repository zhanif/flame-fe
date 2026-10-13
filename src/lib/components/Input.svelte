<script lang="ts">
  import { control } from '$lib/ui';
  import type { Component } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = HTMLInputAttributes & { icon?: Component<any> };

  let { value = $bindable(''), icon: Icon, class: className = '', ...rest }: Props = $props();
</script>

{#if Icon}
  <div class="relative {className}">
    <Icon class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
    <input bind:value class="{control} w-full h-9 pl-9 pr-3 text-sm" {...rest} />
  </div>
{:else}
  <input bind:value class="{control} w-full h-9 px-3 text-sm {className}" {...rest} />
{/if}
