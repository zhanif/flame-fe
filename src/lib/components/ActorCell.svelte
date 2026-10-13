<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import type { UserProfile } from '$lib/api/endpoints';
  import { Bot } from '@lucide/svelte';

  // Who did it: avatar, display name (from the server-side cache), and the id
  // right below it. A name Discord could not resolve falls back to "Unknown user".
  let { actor }: { actor: UserProfile } = $props();

  const name = $derived(actor.name ?? 'Unknown user');
</script>

<div class="flex items-center gap-2.5 min-w-0">
  {#if actor.kind === 'system'}
    <div class="w-8 h-8 shrink-0 rounded-full bg-zinc-700/40 ring-1 ring-zinc-600/40 flex items-center justify-center">
      <Bot class="w-4 h-4 text-zinc-400" />
    </div>
  {:else}
    <Avatar src={actor.avatar_url} name={name} id={actor.id} size="sm" />
  {/if}
  <div class="min-w-0 leading-4">
    <p class="text-xs font-semibold truncate {actor.name ? 'text-zinc-100' : 'text-zinc-500'}">{name}</p>
    {#if actor.kind === 'user'}
      <p class="text-xs font-mono text-zinc-500 truncate" title={actor.id}>{actor.id}</p>
    {:else}
      <p class="text-xs text-zinc-500">Automatic</p>
    {/if}
  </div>
</div>
