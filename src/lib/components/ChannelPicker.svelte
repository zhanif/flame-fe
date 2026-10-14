<script lang="ts">
  import Combobox from '$lib/components/Combobox.svelte';
  import type { DiscordChannel } from '$lib/api/endpoints';

  // Choosing ONE channel or thread: a dropdown you can type in to search. The first entry (`none`)
  // clears the choice. (Picking several would be a chip box, like RolePicker.)
  let {
    channels,
    value = $bindable(''),
    none,
    label,
    disabled = false,
    onchange,
    class: className = '',
  }: {
    channels: DiscordChannel[];
    value?: string;
    /** What "no channel" is called, e.g. "Not logged". */
    none: string;
    label: string;
    disabled?: boolean;
    onchange?: () => void;
    class?: string;
  } = $props();

  // 0 text channel, 5 announcement channel, 10 and 11 announcement and public threads: the
  // places the bot can post in (private threads are left out, the bot is rarely a member).
  const THREAD_TYPES = [10, 11];
  const postable = $derived(channels.filter(c => c.type === 0 || c.type === 5 || THREAD_TYPES.includes(c.type)));
  const options = $derived([
    { value: '', label: none },
    ...postable.map(c =>
      THREAD_TYPES.includes(c.type)
        ? { value: c.id, label: c.name, hint: c.parent_name ? `thread in #${c.parent_name}` : 'thread', keywords: c.parent_name ?? '' }
        : { value: c.id, label: `#${c.name}` },
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
