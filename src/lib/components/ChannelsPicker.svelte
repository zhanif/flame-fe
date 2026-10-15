<script lang="ts">
  import ChipPicker, { type ChipItem } from '$lib/components/ChipPicker.svelte';
  import type { DiscordChannel } from '$lib/api/endpoints';
  import { channelIcon } from '$lib/channel-icons';

  // Several channels, threads, forums or categories at once, as chips (one is ChannelPicker, a
  // dropdown). `max` is the plan limit: a server that has reached it removes a chip to pick another.
  let {
    channels,
    selected,
    onchange,
    max,
    disabled = false,
    placeholder = 'Search channels...',
    label,
  }: {
    channels: DiscordChannel[];
    selected: string[];
    onchange: (next: string[]) => void;
    max?: number;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
  } = $props();

  // 0 text, 5 announcement, 4 category, 15 forum, 16 media, 10 and 11 threads. A watched place
  // covers what is under it, which is why a forum or a category is a fine choice.
  const KINDS: Record<number, (c: DiscordChannel) => Omit<ChipItem, 'id' | 'name'>> = {
    0: () => ({ icon: channelIcon(0) }),
    5: () => ({ icon: channelIcon(5), hint: 'announcements' }),
    4: () => ({ icon: channelIcon(4), hint: 'category' }),
    15: () => ({ icon: channelIcon(15), hint: 'forum' }),
    16: () => ({ icon: channelIcon(16), hint: 'media' }),
    10: c => ({ icon: channelIcon(10), hint: c.parent_name ? `thread in #${c.parent_name}` : 'thread' }),
    11: c => ({ icon: channelIcon(11), hint: c.parent_name ? `thread in #${c.parent_name}` : 'thread' }),
  };

  const items = $derived(
    channels
      .filter(c => c.type in KINDS)
      .map(c => ({ id: c.id, name: c.name, ...KINDS[c.type](c) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
</script>

<ChipPicker {items} {selected} {onchange} {max} {disabled} {placeholder} {label} />
