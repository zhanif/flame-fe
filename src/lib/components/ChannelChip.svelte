<script lang="ts">
  import type { DiscordChannel } from '$lib/api/endpoints';
  import { channelIcon } from '$lib/channel-icons';

  // A channel as a small chip with an icon for its kind; `missing` when it was deleted.
  let { channel, missing = 'Deleted channel' }: { channel?: DiscordChannel; missing?: string } = $props();

  const Icon = $derived(channelIcon(channel?.type));
</script>

<span class="inline-flex max-w-full items-center gap-1.5 rounded-md bg-zinc-800/70 px-2 py-1 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700/60">
  <Icon class="h-3 w-3 shrink-0 text-zinc-400" />
  <span class="truncate">{channel?.name ?? missing}</span>
</span>
