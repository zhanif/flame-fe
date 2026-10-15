<script lang="ts">
  import Combobox from '$lib/components/Combobox.svelte';
  import type { DiscordChannel } from '$lib/api/endpoints';
  import { shortChannelProblem } from '$lib/problems';
  import { channelIcon } from '$lib/channel-icons';

  // Choosing ONE channel or thread: a dropdown you can type in to search. The first entry (`none`)
  // clears the choice. (Picking several would be a chip box, like RolePicker.)
  let {
    channels,
    value = $bindable(''),
    none,
    label,
    disabled = false,
    all = false,
    manageable = false,
    onchange,
    class: className = '',
  }: {
    channels: DiscordChannel[];
    value?: string;
    /** What "no channel" is called, e.g. "Not logged". */
    none: string;
    label: string;
    disabled?: boolean;
    /** Offer every channel (voice, categories, forums) and not just the ones the bot can post in; threads are left out. */
    all?: boolean;
    /** For a channel the bot will keep the permissions of: one it cannot manage is listed with the reason, but cannot be picked. */
    manageable?: boolean;
    onchange?: () => void;
    class?: string;
  } = $props();

  // 0 text channel, 5 announcement channel, 10 and 11 announcement and public threads: the
  // places the bot can post in (private threads are left out, the bot is rarely a member).
  const THREAD_TYPES = [10, 11];
  // Each kind of channel has its own icon, and a category reads as a heading, so a long list can be scanned.
  const postable = $derived(channels.filter(c => (all ? !THREAD_TYPES.includes(c.type) && c.type !== 12 : c.type === 0 || c.type === 5 || THREAD_TYPES.includes(c.type))));
  const options = $derived([
    { value: '', label: none },
    ...postable.map(c =>
      THREAD_TYPES.includes(c.type)
        ? { value: c.id, label: c.name, icon: channelIcon(c.type), hint: c.parent_name ? `thread in #${c.parent_name}` : 'thread', keywords: c.parent_name ?? '' }
        : {
            value: c.id,
            label: c.name,
            icon: channelIcon(c.type),
            ...(c.type === 4 ? { heading: true } : {}),
            ...(manageable && c.problem ? { disabled: true, hint: shortChannelProblem(c.problem), tooltip: c.problem } : {}),
          },
    ),
    // An archived thread is not in the live list, but it can still be the saved choice.
    ...(value && !postable.some(c => c.id === value) ? [{ value, label: `Unavailable (${value})` }] : []),
  ]);
</script>

<Combobox
  bind:value={() => value,
  v => {
    value = v;
    onchange?.();
  }}
  {options}
  placeholder="Search channels or threads..."
  {label}
  {disabled}
  class={className}
/>
