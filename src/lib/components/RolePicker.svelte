<script lang="ts">
  import ChipPicker from '$lib/components/ChipPicker.svelte';
  import type { DiscordRole } from '$lib/api/endpoints';
  import { problemKind, shortRoleProblem } from '$lib/problems';
  import { Link2, Lock } from '@lucide/svelte';

  // Several roles at once, as colored chips. Everything but the role list goes straight to
  // ChipPicker. Choosing ONE role is a different control: RoleSelect.
  let {
    roles,
    placeholder = 'Type to search roles...',
    manageable = false,
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
    /** For roles the bot will grant or take: one it cannot manage is listed in its color with the reason, but cannot be picked. */
    manageable?: boolean;
  } = $props();

  const badgeOf = (problem: string) => {
    const kind = problemKind(problem);
    return kind === 'integration' ? { badge: Link2 } : kind === 'above' ? { badge: Lock } : {};
  };
  const items = $derived(roles.map(r => ({ id: r.id, name: r.name, color: r.color, ...(manageable && r.problem ? { disabled: true, hint: shortRoleProblem(r.problem), tooltip: r.problem, ...badgeOf(r.problem) } : {}) })));
</script>

<ChipPicker {items} {placeholder} {...rest} />
