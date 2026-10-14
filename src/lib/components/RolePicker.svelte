<script lang="ts">
  import ChipPicker from '$lib/components/ChipPicker.svelte';
  import type { DiscordRole } from '$lib/api/endpoints';

  // Several roles at once, as colored chips. Everything but the role list goes straight to
  // ChipPicker. Choosing ONE role is a different control: RoleSelect.
  let {
    roles,
    placeholder = 'Type to search roles...',
    ...rest
  }: {
    roles: DiscordRole[];
    selected: string[];
    onchange: (next: string[]) => void;
    locked?: string[];
    lockedHint?: string;
    hidden?: string[];
    placeholder?: string;
    disabled?: boolean;
    max?: number;
    label?: string;
  } = $props();

  const items = $derived(roles.map(r => ({ id: r.id, name: r.name, color: r.color })));
</script>

<ChipPicker {items} {placeholder} {...rest} />
